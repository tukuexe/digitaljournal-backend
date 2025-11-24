// api/bot.js - Fixed version
const TELEGRAM_TOKEN = "8492147980:AAGlIG1ZfUdU7LwCRqWbQVtCMW4mkZ0N7_0";
const YOUR_CHAT_ID = "6142816761";

// In-memory storage
let journals = [
  {
    id: 1,
    title: "Welcome to My Digital Journal",
    content: "This is your first journal entry. Send /new_post to your Telegram bot to create new entries!",
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: "Studying",
    content: "Your studying journal entry",
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    title: "Hell",
    content: "Your hell journal entry", 
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    title: "Next",
    content: "Your next journal entry",
    createdAt: new Date().toISOString()
  }
];

let userSessions = {};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    console.log('GET request received');
    try {
      // Return all journals sorted by newest first
      const sortedJournals = journals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.status(200).json(sortedJournals);
    } catch (error) {
      console.error('GET Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'No message provided' });
      }

      const chatId = message.chat.id.toString();
      const text = message.text;

      // Check authorization
      if (chatId !== YOUR_CHAT_ID) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Initialize user session
      if (!userSessions[chatId]) {
        userSessions[chatId] = { state: 'idle', currentPost: {} };
      }

      const session = userSessions[chatId];

      // Handle commands
      if (text === '/new_post' || text === '/start') {
        session.state = 'awaiting_title';
        session.currentPost = {
          id: Date.now(),
          title: '',
          content: '',
          createdAt: new Date().toISOString()
        };
        
        await sendTelegramMessage(chatId, '📝 <b>New Journal Entry</b>\n\nPlease enter your journal title:');
        return res.status(200).json({ status: 'awaiting_title' });
      }

      if (session.state === 'awaiting_title') {
        session.currentPost.title = text;
        session.state = 'awaiting_content';
        await sendTelegramMessage(chatId, '✍️ <b>Title saved!</b>\n\nNow please write your journal content:');
        return res.status(200).json({ status: 'awaiting_content' });
      }

      if (session.state === 'awaiting_content') {
        session.currentPost.content = text;
        
        // Add to journals
        journals.unshift(session.currentPost);
        
        // Reset session
        session.state = 'idle';
        session.currentPost = {};
        
        await sendTelegramMessage(chatId, '✅ <b>Journal published!</b>\n\nYour entry is now live on your website.');
        return res.status(200).json({ status: 'journal_created' });
      }

      await sendTelegramMessage(chatId, '📔 <b>DigitalJournal Bot</b>\n\nUse /new_post to create a new journal entry.');
      return res.status(200).json({ status: 'ok' });

    } catch (error) {
      console.error('POST Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function sendTelegramMessage(chatId, text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}
