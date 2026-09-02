# Playbook — Dependência npm comprometida

Guia rápido para responder a um pacote npm malicioso (typosquat, conta de mantenedor
invadida, ataque tipo Shai-Hulud / axios). Tempo é crítico: a janela entre a
publicação maliciosa e a detecção costuma ser de horas.

## 0. Sinais de alerta

- Aviso do GitHub / `npm audit` sobre malware (não só CVE de DoS).
- PR do Dependabot que adiciona dezenas de transitivas para "corrigir" algo pequeno.
- `resolved` de um pacote no lockfile mudando para fora de `registry.npmjs.org`.
- Build/postinstall fazendo requisições de rede inesperadas.
- `npm ci` puxando versão diferente da esperada (lockfile x package.json divergentes).

## 1. Conter (minutos)

- [ ] **Congelar deploys.** Pausar o pipeline de release.
- [ ] Identificar a versão exata comprometida (`npm view <pkg> versions`, changelog do advisory).
- [ ] Pinar para a última versão sabidamente boa **e** adicionar `overrides` para forçar transitivas:
      ```jsonc
      // package.json
      "overrides": { "<pkg>": "<versão-boa>" }
      ```
- [ ] `rm -rf node_modules package-lock.json && npm install` e conferir o diff do lockfile.
- [ ] `npm ci` em ambiente limpo; rodar `npm run lint`, `npm test`, `npm run build`.

## 2. Avaliar exposição (primeira hora)

- [ ] O pacote roda em **build/dev** (máquina do dev, runner de CI) ou em **runtime** (servidor / bundle do browser)?
- [ ] O malware exfiltra env/segredos? Checar quais segredos o CI e a máquina do dev tinham em `process.env`.
- [ ] Alguém rodou `npm install` com a versão ruim entre a publicação e agora? (`git log -- package-lock.json`, logs de CI)

## 3. Rotacionar credenciais (se houve execução da versão ruim)

Rotacionar **tudo** que estava acessível ao processo que rodou o pacote:

- [ ] `JWT_SECRET` (backend) — invalida todas as sessões; comunicar/forçar re-login.
- [ ] `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` — revogar no console do provedor, gerar nova.
- [ ] `DATABASE_URL` / senha do Postgres.
- [ ] Tokens de CI: `GITHUB_TOKEN` de fluxo, secrets do repo, tokens de publish npm.
- [ ] Chaves SSH / cloud da máquina do dev afetada.

## 4. Erradicar e verificar

- [ ] Confirmar `npm audit` limpo no nível de severidade acordado.
- [ ] `npx lockfile-lint --path package-lock.json --validate-https --allowed-hosts npm`.
- [ ] Revisar o diff completo do `package-lock.json` no PR de correção.
- [ ] Retomar deploys só depois de um build verde de ponta a ponta.

## 5. Pós-incidente

- [ ] Registrar timeline (quando publicou, quando detectou, quando conteve).
- [ ] Adicionar o pacote/versão a uma denylist se a ferramenta permitir.
- [ ] Se faltou gate: adicionar `npm audit` / `lockfile-lint` / `--ignore-scripts` no CI.

## Prevenção (já no repo)

- `.npmrc`: `save-exact=true`, `audit=true`, `engine-strict=true`.
- CI: `npm ci` (nunca `npm install`), gate de `npm audit`, `lockfile-lint`, actions pinadas por SHA.
- Dependabot semanal com minor/patch agrupados (`.github/dependabot.yml`).
- Nunca instalar pacote sugerido por chat sem conferir em `npmjs.com` (nomes alucinados viram alvo de squat).
