Prometheus + Grafana: Guia Rápido (Dev)

Este guia mostra como:





Iniciar o Prometheus apontando para seu prometheus.yml



Acessar <http://localhost:9090>



Subir Grafana, configurar o Data Source Prometheus e montar dashboards básicos de latência e erros HTTP



Pré-requisitos: Docker instalado (recomendado) OU Prometheus/Grafana instalados localmente; arquivo prometheus.yml já criado no seu projeto.



1) Iniciar Prometheus

Opção A — via Docker (mais simples)





Certifique-se de que seu prometheus.yml está no diretório atual.



Rode:

# Cria rede isolada (para Grafana enxergar o Prometheus por nome de serviço)
docker network create observabilidade-net || true

# Sobe o Prometheus mapeando o prometheus.yml
docker run -d \
  --name prometheus \
  --network observabilidade-net \
  -p 9090:9090 \
  -v "$(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml:ro" \
  prom/prometheus:latest \
  --config.file=/etc/prometheus/prometheus.yml \
  --web.enable-lifecycle





Acesse: http://localhost:9090





Em "Status → Targets" verifique se seus scrape_configs estão UP.



Use "Graph" para testar consultas.

Opção B — binário local

Se você instalou Prometheus nativamente:

prometheus \
  --config.file=./prometheus.yml \
  --web.listen-address=":9090" \
  --web.enable-lifecycle

Acesse: http://localhost:9090



2) Subir Grafana e configurar Data Source

Subir Grafana (Docker)

docker run -d \
  --name grafana \
  --network observabilidade-net \
  -p 3000:3000 \
  grafana/grafana-oss:latest

Acesse: http://localhost:3000





Login padrão: usuário admin, senha admin (você será solicitado a trocar)

Adicionar Data Source (Prometheus)





Em Grafana, vá em "Configuration → Data sources → Add data source".



Escolha Prometheus.



Em "HTTP → URL":





Se você usou a rede Docker acima: <http://prometheus:9090>



Se Grafana está fora do Docker e Prometheus local: <http://localhost:9090>



Clique em Save & test e confirme "Data source is working".



3) Dashboards: Latência e Erros HTTP

Abaixo, painéis básicos usando métricas comuns (adaptar aos nomes/labels do seu metrics.middleware).



Observação: Se você usa prom-client com histogram para latência por rota, os nomes típicos podem ser http_request_duration_seconds_bucket e labels method, route, status_code. Ajuste conforme seu código.

3.1 Latência (p95) global

Painel do tipo Time series com consulta:

histogram_quantile(
  0.95,
  sum by (le) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)





Unificar por le agrega todos os buckets.



Ajuste janela ([5m]) conforme necessidade.

3.2 Latência (p95) por rota

histogram_quantile(
  0.95,
  sum by (route, le) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)





Use "Legend" para exibir {{route}}.



Em "Transformations" você pode ordenar por valor atual.

3.3 Taxa de erros (5xx) por rota

Painel Time series ou Bar chart com:

sum by (route) (
  rate(http_requests_total{status_code=~"5.."}[5m])
)





Se sua métrica usa status/code em vez de status_code, ajuste o label.



Para taxa geral de erros (todos os códigos 5xx): remova by (route).

3.4 Taxa de requisições por método/rota

sum by (method, route) (
  rate(http_requests_total[5m])
)





Útil para entender volume por endpoint e verbo.

3.5 Duração média (approx.)

Se você também expõe http_request_duration_seconds_sum e http_request_duration_seconds_count:

sum(rate(http_request_duration_seconds_sum[5m]))
/
sum(rate(http_request_duration_seconds_count[5m]))





Painel Stat ou Time series. Mostra tempo médio em segundos.



4) Importar dashboards prontos (opcional)

Você pode importar dashboards da comunidade Grafana:





Em Grafana: "Dashboards → Import".



Informe um ID do Grafana.com (ex.: procure por "Prometheus overview" ou "Node.js Prometheus" e escolha um dashboard compatível com suas métricas).



Vincule ao seu Data Source Prometheus.



Nota: Dashboards genéricos podem esperar nomes de métricas diferentes dos seus. Se não aparecer dados, ajuste os painéis para os nomes/labels do seu projeto.



5) Dicas rápidas





Alterar config do Prometheus sem reiniciar:





Habilitamos --web.enable-lifecycle. Faça curl -X POST <http://localhost:9090/-/reload> após editar prometheus.yml.



Proteção local mínima:





Em dev, mantenha Prometheus/Grafana apenas em localhost. Em produção, use reverso proxy com auth.



Persistência:





Prometheus em Docker: mapeie um volume para /prometheus para manter TSDB.



6) docker-compose (opcional)

Crie docker-compose.yml para subir tudo junto:

version: "3.8"
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--web.enable-lifecycle"

  grafana:
    image: grafana/grafana-oss:latest
    container_name: grafana
    ports:
      - "3000:3000"
    depends_on:
      - prometheus

volumes:
  prometheus-data:

Após salvar:

docker compose up -d





Data Source URL em Grafana: <http://prometheus:9090>



Dashboards: crie/importe conforme seções acima.