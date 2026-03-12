# 🐳 Entendendo o Docker e o Motor Cobalt no VidSave

Neste documento, vamos destrinchar **exatamente** o que o Docker está fazendo no seu computador agora, como o VidSave passou a depender dele, e quais são os **limites e custos** reais quando você lançar esse aplicativo para o público.

---

## 1. O que é o Docker? (A Analogia do Navio)
Imagine que o sistema do "Cobalt" (os códigos complexos que burlam o YouTube e baixam em 1080p) foi programado em uma versão específica do Linux, precisando de milhares de bibliotecas e ferramentas de rede que você não tem no seu Mac ou no Windows.

Se eu mandasse você instalar todas as peças do Cobalt à mão, demoraria horas e algo daria errado porque as peças não encaixariam perfeitamente no seu sistema.

**A solução:** O Docker. Ele pega esse programa inteiro (o Cobalt) e o tranca dentro de um **Contêiner** completamente lacrado (como os contêineres de um navio cargueiro). Esse contêiner tem o próprio sistema operacional falso dele ali dentro, com todas as pecinhas perfeitamente encaixadas. 

Quando você roda `docker compose up`, o Docker baixa essa caixa pronta da internet e liga ela na sua máquina. O aplicativo passa a rodar isolado do seu computador, mas nós fizemos um "furo" na caixa e conectamos ela diretamente na sua porta **`9001`**. 

## 2. Como o VidSave depende dele agora?
A dependência é vital para a qualidade do YouTube.
- **Antes (Rota Pública):** O VidSave pedia o vídeo para `https://api.cobalt.tools`. Como vinham milhares de pessoas pedir ao mesmo tempo do mundo todo, o servidor de lá cobrava "Tokens" (JWT) ou bloqueava o nosso IP temporariamente, nos forçando a usar o plano C (yt-dlp com qualidade inferior).
- **Agora (Rota Privada/Docker):** O nosso backend (`server.js`) manda a requisição de download inteira direto para a **sua porta `9001`** (a nossa caixa isolada do Cobalt). 
  - **A vantagem surreal:** O motor agora é 100% SEU. Ele aciona o motor interno e vai baixar do YouTube a 1080p sem **nunca mais** usar os tokens da API pública.

---

## 3. Existem limites de uso de dados para o Docker/Cobalt?
**Rápido e Direto:** NÃO existem limites de software e NÃO existem custos pelo Docker ou pela API do Cobalt. Ambos são Open-Source (gratuitos e livres).

Sendo dono da sua própria API (graças ao Docker), a plataforma não te corta ou exige pagamentos por usar "1.000 requisições". 

**Entretanto, os únicos limites reais passam a ser da sua máquina (Servidor):**

1. **O Banimento por IP do próprio YouTube (Shadowban)**
   - Se o seu servidor começar a baixar milhares de vídeos por minuto usando a mesma máquina e o mesmo IP de rede, o YouTube (Google) vai detectar um tráfego de um bot malicioso tentando varrer os seus servidores.
   - O Google pode bloquear a conexão da máquina que o Docker está usando temporariamente (Erro 403). Para resolver, sistemas enormes precisam alugar vários "proxies" (IPs falsos) baratos para camuflar suas intensões.

2. **O Tráfego de Banda (Bandwidth limits)**
   - O download acontece em "Mão Dupla". 
   - Quando um usuário manda o link no seu site, o Docker baixa o vídeo do servidor original do YouTube para o seu Servidor *(*Downloading banda de entrada*)*, e em seguida entrega esse arquivo do seu Servidor para o navegador do cliente *(*Uploading banda de saída*)*.
   - Se o vídeo tiver 100 Megabytes, o seu servidor gasta **200 Megabytes** de tráfego a cada pessoa.

---

## 4. O que muda e quanto vai custar para deixar o sistema público na Internet?

Se você quiser alavancar o VidSave online hoje para o mundo inteiro colocar seus links lá, o seu computador pessoal onde estamos testando os *localhosts* não servirá, e a fatura chegará. 

Você terá que **alugar um Servidor Privado Virtual (VPS)** robusto, instalar o Docker lá dentro e espelhar esse projeto 24/7.
Aqui estão os custos estimados de uma infraestrutura moderna de vídeos:

- **1. Hospedagem Robusta (CPU/RAM)**: 
  A conversão de PDFs (`ffmpeg`/`libreoffice`) e a emulação do "Chrome Fantasma" (`Puppeteer`) para capturar links do Facebook precisam de pelo menos 4GB de RAM garantidos. Alugar uma máquina em provedoras como AWS (Amazon), Google Cloud ou DigitalOcean com boas especificações custará cerca de **\$10 a \$20 Dólares por mês**. 
- **2. A armadilha do Custo por Transferência (Banda/Outbound Data)**:
  Existem empresas que cobram por Gygabyte que sai do seu servidor (a AWS Cobra \$0.09 centavos por GB após o primeiro terabyte). Se o seu site viralizar e 10 mil usuários baixarem 50 Megabytes cada por dia, aquele vídeo pesado irá explodir sua fatura de tráfego de dados no final do mês. 
  
**💡 Meu Conselho para ir ao Ar:**
1. Focaremos o lado do marketing apenas após termos implementado todas as redes. Quando formos publicar, fugiremos de nuvens caras como Amazon AWS e hospedaremos a máquina Linux do VidSave na **Hetzner** ou na **Contabo** — essas provedoras de servidor custam cerca de **6 € a 10 € euros (mensais fixes)** e dão entre *20 a 32 Terabytes* de banda grátis com processadores excelentes, que engolem perfeitamente o seu Docker.
