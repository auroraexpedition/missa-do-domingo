# Missa do Domingo

PWA (site com cara de app) das missas de domingo das igrejas que a família
frequenta, em Fortaleza. 100% estático e offline — roda no GitHub Pages.
(A liturgia do dia / jornalzinho fica no app Angelus, à parte.)

## Telas
- **Próximas missas** — feed do fim de semana a partir de agora; missas já
  celebradas ficam esmaecidas. Vigília de sábado (≥16h) vale pelo domingo.
- **Igrejas & capelas** — consulta por igreja, com Google Maps e Waze.

## Publicar no GitHub Pages
1. Crie um repositório novo (ex.: `missa-do-domingo`) na conta `auroraexpedition`.
2. Suba **todos** os arquivos desta pasta na raiz do repositório.
3. Settings → Pages → Source: branch `main`, pasta `/root` → Save.
4. Fica em: `https://auroraexpedition.github.io/missa-do-domingo/`
5. No celular, abra o link e use "Adicionar à tela inicial" para instalar.

## Atualizar horários / igrejas
Tudo fica no início do `app.js`, no array `CHURCHES`. Cada igreja tem:
`vigil` (missas de sábado à tarde que valem pelo domingo) e `sunday`.
Depois de editar, se o app não atualizar no celular, troque a versão do
cache em `sw.js` (`missa-domingo-v1` → `-v2`).

## Offline
O service worker guarda o app e a última liturgia baixada. Dentro da igreja,
mesmo sem sinal, o jornalzinho do domingo aberto por último continua disponível.
