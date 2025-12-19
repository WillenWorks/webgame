Observabilidade e Métricas – Guia de Instalação e Manutenção (VPS + AWS)

Este guia descreve, em detalhes, como instalar, expor com segurança e manter o endpoint de métricas Prometheus (/metrics) e o ecossistema de observabilidade para um backend Node.js (em VPS) e frontend na AWS (com integração). Inclui criação de tokens de acesso (
METRICS_AUTH_TOKEN
), configurações de Prometheus/Grafana, reverso via Nginx, segurança (CORS, Helmet, Rate Limit), e passos de rotina/automação.



1. Pré-requisitos

1.1. Código do Backend (Node.js)





Backend com:





Endpoint GET /metrics (Prometheus text format)



Middlewares de segurança (requestId, Rate Limit, sanitize)



Helmet + CORS estrito



Zod para validação de rotas



Variáveis .env suportadas:





ALLOWED_ORIGINS – CSV de origens permitidas (ex.: <https://seu-frontend.com>)



METRICS_ENABLED – true|false (habilita/desabilita /metrics)



METRICS_AUTH_TOKEN – token obrigatório (se definido) no header X-Metrics-Token



RATE_LIMIT_WINDOW_MS – janela em ms (ex.: 60000)



RATE_LIMIT_MAX – máximo de requisições por janela (ex.: 300)



JWT_SECRET – obrigatório, chave do JWT



JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES_DAYS – expiração de tokens

1.2. Banco de Dados (MySQL)





Usuário e senha para o backend



Acesso restrito por IP (VPS / Security Group na nuvem)



Backups automatizados (mysqldump + cron)

1.3. Prometheus/Grafana





Prometheus para scrape do endpoint /metrics



Grafana para visualização (painéis e alertas)

1.4. Reverse Proxy





Nginx (VPS) ou ALB / CloudFront (AWS)



Certificado TLS (Let’s Encrypt ou ACM)



2. VPS (Backend + Banco de Dados)

2.1. Instalação do Backend (Node.js)





Instale dependências do sistema (Ubuntu/Debian):

sudo apt-get update && sudo apt-get install -y git curl build-essential nginx mysql-client





Instale Node.js (LTS):

curl -fsSL <https://deb.nodesource.com/setup_lts.x> | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v





Clone o repositório do backend:

cd /opt && sudo git clone <https://seu-repo.git> backend
sudo chown -R $USER:$USER /opt/backend
cd /opt/backend





Instale dependências do projeto:

npm install





Configure .env (crie /opt/backend/.env):

ALLOWED_ORIGINS=<https://seu-frontend.com>
METRICS_ENABLED=true
METRICS_AUTH_TOKEN=gerado-por-script-ou-manualmente
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=300
JWT_SECRET=coloque-uma-chave-forte
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES_DAYS=30
DB_HOST=127.0.0.1
DB_USER=backend_user
DB_PASSWORD=backend_pwd
DB_NAME=project_detective





Crie um serviço systemd para o backend (/etc/systemd/system/backend.service):

[Unit]
Description=Backend Node API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/backend
ExecStart=/usr/bin/node src/server.js
Restart=always
EnvironmentFile=/opt/backend/.env
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target

Ative e inicie:

sudo systemctl daemon-reload
sudo systemctl enable backend
sudo systemctl start backend
sudo systemctl status backend -n 50

2.2. Nginx como Reverse Proxy





Configure servidor com HTTPS (Let’s Encrypt ou certificado):





Instale certbot:

sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.seu-dominio.com





Crie um server block (/etc/nginx/sites-available/backend):

server {
  listen 80;
  server_name api.seu-dominio.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.seu-dominio.com;

  ssl_certificate /etc/letsencrypt/live/api.seu-dominio.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.seu-dominio.com/privkey.pem;

  # Protege /metrics via token
  location /metrics {
    proxy_set_header X-Metrics-Token METRICS_AUTH_TOKEN_AQUI;
    proxy_pass <http://127.0.0.1:3333/metrics>
  }

  # API geral
  location / {
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
    proxy_pass <http://127.0.0.1:3333>
  }
}





Habilite a configuração:

sudo ln -sf /etc/nginx/sites-available/backend /etc/nginx/sites-enabled/backend
sudo nginx -t && sudo systemctl reload nginx

2.3. Prometheus (VPS)





Instale Prometheus (binário):

wget <https://github.com/prometheus/prometheus/releases/download/v2.54.1/prometheus-2.54.1.linux-amd64.tar.gz>
tar -xzf prometheus-*.tar.gz
sudo mv prometheus-*/prometheus /usr/local/bin/
sudo mv prometheus-*/promtool /usr/local/bin/
sudo mkdir -p /etc/prometheus /var/lib/prometheus
sudo mv prometheus-*/consoles /etc/prometheus/
sudo mv prometheus-*/console_libraries /etc/prometheus/





prometheus.yml básico (/etc/prometheus/prometheus.yml):

global:
  scrape_interval: 10s

scrape_configs:
  - job_name: 'backend'
    metrics_path: /metrics
    scheme: https
    static_configs:
      - targets: ['api.seu-dominio.com']
    relabel_configs:
      # Adiciona header X-Metrics-Token – via nginx já inserido, opcional aqui
      - action: keep
        source_labels: [__address__]





Crie serviço systemd do Prometheus:

# /etc/systemd/system/prometheus.service
[Unit]
Description=Prometheus Monitoring
After=network.target

[Service]
User=www-data
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus
Restart=always

[Install]
WantedBy=multi-user.target

Ative e inicie:

sudo systemctl daemon-reload
sudo systemctl enable prometheus
sudo systemctl start prometheus
sudo systemctl status prometheus -n 50

2.4. Grafana (VPS)





Instale Grafana:

sudo apt-get install -y software-properties-common
sudo add-apt-repository -y "deb <https://packages.grafana.com/oss/deb> stable main"
wget -q -O - <https://packages.grafana.com/gpg.key> | sudo apt-key add -
sudo apt-get update && sudo apt-get install -y grafana





Inicie:

sudo systemctl enable grafana-server
sudo systemctl start grafana-server





Configure data source Prometheus:





Acesse <http://seu-servidor:3000> (default admin/admin, troque a senha)



Data source: URL <http://localhost:9090>



Dashboards:





HTTP Requests: rate(http_requests_total[5m]) por route/status



Latência: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))



IA Fallback: increase(ai_requests_total{result="fallback"}[1h])

2.5. Criação e Rotação de Tokens (METRICS_AUTH_TOKEN)





Gere um token forte:

# 64 bytes hex
TOKEN=$(openssl rand -hex 32)
echo $TOKEN





Coloque o token em .env do backend:

METRICS_AUTH_TOKEN=$TOKEN





Atualize Nginx para injetar o header:

location /metrics {
  proxy_set_header X-Metrics-Token $TOKEN;
  proxy_pass <http://127.0.0.1:3333/metrics>
}





Reinicie serviços:

sudo systemctl restart backend
sudo systemctl reload nginx





Rotação (semestral/mensal):





Gere novo token, atualize .env e Nginx



Reinicie backend e reconfigure Prometheus (se usar cabeçalho direto nele)



Verifique que /metrics retorna 200

2.6. Manutenção do VPS





Logs: verifique /var/log/nginx/access.log e error.log + journalctl -u backend -n 100



Backups: cron /usr/bin/mysqldump -u user -pPwd db > /backups/db-$(date +%F).sql



Segurança: manter firewall (ufw), bloquear /metrics por IP (allowlist) além do token



3. AWS (Frontend + Integração com Backend)

3.1. Arquitetura recomendada





Frontend (SPA) em S3 + CloudFront



Backend na EC2/ECS/EKS com ALB/NGINX, HTTPS (ACM)



Métricas expostas via /metrics somente internamente (SG) ou via token + WAF permitindo apenas IPs do Prometheus



Prometheus/Grafana:





EC2: stack própria



EKS: Helm charts (Prometheus Operator), Grafana em namespace dedicado

3.2. CloudFront + S3 (Frontend)





S3 bucket (site hosting desabilitado, acesso privado)



CloudFront distribui S3; usar origin access control (OAC)



No frontend, configure ALLOWED_ORIGINS=<https://seu-cloudfront-domain.cloudfront.net>

3.3. Backend em EC2





Instalação semelhante ao VPS



Use Security Groups:





ALB → EC2 (porta 3333)



EC2 → MySQL (porta 3306, apenas DB SG)



WAF no ALB bloqueando /metrics exceto Prometheus IPs



Nginx injeta X-Metrics-Token para /metrics

3.4. Backend em ECS/EKS





ECS Fargate: service com ativação de awsvpc, SG restritos



EKS: Ingress Controller (Nginx/ALB), NetworkPolicy para permitir scraping interno



Prometheus Operator (Helm):

helm repo add prometheus-community <https://prometheus-community.github.io/helm-charts>
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack -n observability --create-namespace





ServiceMonitor para backend:

apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: backend-monitor
  namespace: observability
spec:
  selector:
    matchLabels:
      app: backend
  endpoints:
    - port: http
      path: /metrics
      interval: 10s

3.5. Tokens e Segurança (AWS)





Gere METRICS_AUTH_TOKEN como no VPS



Armazene no AWS Systems Manager Parameter Store (SecureString) ou Secrets Manager:





metrics/auth/token (SecureString)



Injetar no backend via ECS task env/EC2 .env durante deploy



Para WAF/ALB: regras permitindo /metrics apenas do Prometheus (IP set) + header (opcional)

3.6. Observabilidade Adicional





CloudWatch Logs: redirecione logs de app via awslogs (ECS) ou cloudwatch-agent (EC2)



OpenTelemetry (Tracing):





Node OTel SDK, exportador OTLP → Collector → Tempo/Grafana Cloud/Jaeger



Alertas:





Grafana Alerting (no Grafana OSS/Cloud)



Prometheus Alertmanager (alertas de 5xx por rota, tempo de resposta p95 > X)



4. Operações – Rotina, Troubleshooting e Boas Práticas

4.1. Rotina semanal





Verificar http_requests_total e latência p95 por rota



Checar ai_requests_total{result="fallback"} – se alto, investigar provedor de IA



Rotacionar METRICS_AUTH_TOKEN conforme política interna

4.2. Troubleshooting





/metrics 401: verifique METRICS_AUTH_TOKEN e header X-Metrics-Token



/metrics 404: METRICS_ENABLED=false – habilitar em .env e reiniciar



Prometheus down: checar SG/WAF, cert (TLS), DNS

4.3. Boas práticas





Não exponha /metrics publicamente sem proteção (token + WAF/IP allowlist)



Mantenha TLS em todas as conexões cliente→proxy→app



Crie dashboards por domínio funcional (HTTP, banco, IA)



Documente scripts de backup e restore



5. Exemplos prontos

5.1. .env (dev)

ALLOWED_ORIGINS=
METRICS_ENABLED=true
METRICS_AUTH_TOKEN=
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
JWT_SECRET=dev-secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES_DAYS=30
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=project_detective

5.2. prometheus.yml (dev local)

global:
  scrape_interval: 5s
scrape_configs:
  - job_name: 'backend-dev'
    metrics_path: /metrics
    static_configs:
      - targets: ['localhost:3333']

5.3. Comandos úteis

# Gerar token forte
openssl rand -hex 64

# Testar /metrics com token
curl -H "X-Metrics-Token: SEU_TOKEN" <https://api.seu-dominio.com/metrics> -v

# Ver p95 de latência (PromQL)
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))



6. Checklist de Implantação





Backend rodando (systemd/pm2) com .env correto



Nginx proxy configurado (/metrics injeta X-Metrics-Token)



Certificado TLS válido (Let’s Encrypt ou ACM)



Prometheus configurado (scrape <https://api.seu-dominio.com/metrics>)



Grafana com data source Prometheus e dashboards



WAF/SG restringindo acesso a /metrics (produção)



Routine de rotação METRICS_AUTH_TOKEN documentada



Alertas básicos (erros 5xx > limiar, latência p95 > limiar)



Se desejar, posso fornecer docker-compose.yml pronto para dev (Prometheus + Grafana + backend) e modelos de dashboards Grafana para HTTP/IA.