# OMS Logística

App (PWA) de agendamento de caminhãozinho, carreta CBSI e outros equipamentos da logística da GGMA.

- **Front:** este repositório, HTML/CSS/JS sem build. Publicado como site estático no Render.
- **Servidor e banco:** os mesmos do OMS (`api-oms-csn`, rotas `/api/logistica/*`, banco Neon).
- **Login:** quem tem conta no OMS entra com a mesma matrícula e senha. Quem não tem pede cadastro pelo app e um técnico da logística libera; essa conta só acessa o app da Logística.

## Telas
- **Pedir:** equipamento, quantidade (carreta), dia, horário, setor (OMS, OMR, GGMA, Máquina), origem, destino, carga e emergência.
- **Agenda:** ocupação do dia por equipamento.
- **Meus pedidos:** situação e cancelamento.
- **Logística (técnicos):** aprovar, remarcar para outro dia/horário (já fica aprovado) ou recusar com motivo.
- **Ajustes (técnicos):** liberar cadastros, equipamentos e quem gerencia.

## Publicar mudança
1. Altere os arquivos.
2. Suba `?v=N` em `index.html` (css/js) e a `VERSAO` em `sw.js` (e a lista `ARQUIVOS`).
3. Faça o merge na `main`: o Render publica sozinho.

## Rodar local
```
python3 -m http.server 8766
```
Abra http://localhost:8766. Em `localhost` o app usa a API em `http://localhost:8000`.

## Ícone
Troque os arquivos em `icons/` (180, 192, 512 e `icon-maskable-512.png` com margem de segurança) mantendo os nomes.
