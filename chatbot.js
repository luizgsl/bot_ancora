// Importando dependências
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');



dotenv.config();

// Inicializando o OpenAI com a chave da API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-webgl',
      '--disable-webrtc',
    ],
  },
});

const conversationState = {}; // Armazena o estado da conversa para cada cliente

const sanitizeInput = (text) => text.trim().toLowerCase();

const extractName = (text) => {
  const match = text.match(/(?:me chamo|chamo|sou|meu nome é)\s+([a-zA-ZÀ-ÿ\s]+)/i);
  return match ? match[1] : null;
};

const sendMessage = async (to, text) => {
  try {
    await client.sendMessage(to, text);
  } catch (error) {
    console.error(`Erro ao enviar mensagem para ${to}:`, error);
  }
};

const clearConversationState = (from) => {
  setTimeout(() => {
    delete conversationState[from];
    console.log(`Estado da conversa com ${from} foi limpo devido à inatividade.`);
  }, 86400000); // 24 horas
};

const getAIResponse = async (message) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Você é um assistente virtual especializado em vender sistemas de PDV e Bots de WhatsApp. Sempre seja amigável e direto ao responder.' },
        { role: 'user', content: message },
      ],
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Erro ao gerar resposta do OpenAI:', error.response?.data || error.message);
    return 'Desculpe, houve um problema ao gerar minha resposta. Por favor, tente novamente mais tarde.';
  }
};
const nodemailer = require('nodemailer');

const EMAIL_DESTINO = 'lg158241@gmail.com'; // Altere para o e-mail que vai receber o QR Code
const EMAIL_REMETENTE = 'lg727795@gmail.com'; // E-mail de envio (ex: Gmail)
const SENHA_APP = 'wzjbmwycahcvhdjg'; // Senha do aplicativo (caso use Gmail, crie uma senha de app)
const QR_PATH = './qrcode.png';

let emailEnviado = false; // Variável de controle para evitar reenvios

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_REMETENTE,
        pass: SENHA_APP,
    }
});

client.on('qr', async (qr) => {
    if (emailEnviado || fs.existsSync(QR_PATH)) {
        console.log('QR Code já gerado. Não será reenviado.');
        return;
    }

    console.log('Gerando QR Code...');
    emailEnviado = true; // Marca como enviado

    try {
        await qrcode.toFile(QR_PATH, qr);

        const mailOptions = {
            from: EMAIL_REMETENTE,
            to: EMAIL_DESTINO,
            subject: 'Seu QR Code para o Bot',
            html: `<p>Escaneie o QR Code em anexo para conectar seu bot.</p>`,
            attachments: [{ filename: 'qrcode.png', path: QR_PATH }]
        };

        await transporter.sendMail(mailOptions);
        console.log('QR Code enviado para:', EMAIL_DESTINO);
        
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
    }
});



client.on('ready', () => {
  console.log('Bot está pronto para uso!');
});

client.on('message', async (msg) => {
  if (!msg.from.endsWith('@c.us')) return; // Ignora mensagens que não são de usuários

  if (msg.type !== 'chat') {
    await sendMessage(msg.from, 'Desculpe, não consigo entender mensagens que não sejam de texto. Por favor, envie uma mensagem de texto para continuar.');
    return;
  }

  if (!conversationState[msg.from]) {
    conversationState[msg.from] = { stage: 1 };
  }

  const state = conversationState[msg.from];
  const input = sanitizeInput(msg.body);

  try {
    switch (state.stage) {
      case 1:
        await sendMessage(
          msg.from,
          'Olá! Bem-vindo(a) à nossa empresa! Eu sou o Pedro, seu assistente virtual personalizado. Estou aqui para ajudar. Para começar, como posso te chamar?'
        );
        state.stage = 2;
        break;

      case 2:
        const name = extractName(msg.body);
        if (!name) {
          await sendMessage(msg.from, 'Não consegui entender seu nome. Poderia repeti-lo, por favor?');
          return;
        }
        state.name = name;
        await sendMessage(
          msg.from,
          `Prazer em conhecê-lo(a), ${state.name}! Trabalhamos com dois serviços incríveis para alavancar sua empresa:

1. *Sistema de PDV*: Controle completo de vendas, relatórios detalhados, gestão de estoque e mais.
2. *Bot de WhatsApp*: Automação de atendimento com respostas rápidas, agendamentos e integração total.

Por favor, escolha uma opção para saber mais:
1 - Sistema de PDV
2 - Bot de WhatsApp
3 - Ambos`
        );
        state.stage = 3;
        break;

      case 3:
        if (msg.body === '1' || input.includes('pdv')) {
          await sendMessage(
            msg.from,
            `Nosso Sistema de PDV oferece as seguintes funcionalidades:

- Catálogo digital com link personalizado para envio via WhatsApp, permitindo pedidos e pagamentos via PIX.
- Cardápio digital com QR code para pedidos diretamente das mesas.
- Controle total de vendas com relatórios detalhados.
- Sistema em nuvem, permitindo sincronização em tempo real em vários dispositivos (Android, macOS, Windows, máquinas POS).
- Controle de estoque e muito mais!

Que tal agendarmos uma demonstração gratuita para você conhecer melhor?`
          );
          state.stage = 4;
        } else if (msg.body === '2' || input.includes('bot')) {
          await sendMessage(
            msg.from,
            `Nosso Bot de WhatsApp é perfeito para automação do seu atendimento. Ele inclui:

- Atendimento automatizado 24/7.
- Agendamento de serviços diretamente no WhatsApp.
- Integração com pagamentos online e sistemas de gestão.
- Personalização completa para o seu negócio.
- Chatbot com aprendizado contínuo.
- Relatórios detalhados sobre interações no WhatsApp.

Que tal agendarmos uma demonstração gratuita para você conhecer melhor?`
          );
          state.stage = 5;
        } else if (msg.body === '3' || input.includes('ambos')) {
          await sendMessage(
            msg.from,
            `Nosso Sistema de PDV e Bot de WhatsApp juntos são a combinação perfeita para alavancar seu negócio:

- Sistema de PDV: Catálogo digital, controle de vendas, relatórios, sistema em nuvem, controle de estoque e muito mais.
- Bot de WhatsApp: Automação de atendimento, agendamentos, integrações com pagamentos e sistemas de gestão, e muito mais.

Que tal agendarmos uma demonstração gratuita para você conhecer melhor?`
          );
          state.stage = 6;
        } else {
          await sendMessage(
            msg.from,
            'Desculpe, não entendi sua resposta. Por favor, envie o número da opção desejada: 1, 2 ou 3, ou digite "PDV", "Bot" ou "Ambos".'
          );
        }
        break;

      case 4:
      case 5:
      case 6:
        if (input.includes('demonstração') || input.includes('sim') || input.includes('quero') || input.includes('agendar') || input.includes('testar')) {
          await sendMessage(
            msg.from,
            'Ótimo! Um dos nossos consultores entrará em contato em breve. Enquanto isso, estou aqui para tirar qualquer dúvida que você tenha!'
          );
        } else if (input.includes('preço') || input.includes('valor') || input.includes('custa') || input.includes('cobrança')) {
          await sendMessage(
            msg.from,
            `Aqui estão nossos valores:

- *Sistema de PDV*: R$ 149,90/mês (inclui todas as funcionalidades).
- *Bot de WhatsApp*: R$ 289,90/mês (personalização e suporte incluídos).
- *Pacote Completo*: R$ 399,90/mês (PDV + Bot de WhatsApp com desconto).

Caso tenha interesse, podemos marcar uma demonstração gratuita!`
          );
        } else {
          const aiResponse = await getAIResponse(msg.body);
          await sendMessage(msg.from, aiResponse);
        }
        break;

      default:
        await sendMessage(
          msg.from,
          'Desculpe, não consegui entender. Vamos recomeçar. Por favor, me diga como posso te ajudar!'
        );
        conversationState[msg.from] = { stage: 1 };
        break;
    }

    clearConversationState(msg.from);
  } catch (error) {
    console.error('Erro ao processar a mensagem:', error);
    await sendMessage(
      msg.from,
      'Houve um problema ao processar sua mensagem. Tente novamente mais tarde.'
    );
  }
});

client.initialize();
