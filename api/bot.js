// api/bot.js - LiveJournal Backend
const TELEGRAM_TOKEN = "8492147980:AAGlIG1ZfUdU7LwCRqWbQVtCMW4mkZ0N7_0";
const YOUR_CHAT_ID = "6142816761";

// In-memory storage
let userSessions = {};
let journals = [
  {
    id: 1,
    title: "Welcome to My Digital Journal",
    content: "This is your first journal entry. Send /new_post to your Telegram bot to create new entries! Your thoughts will appear here automatically.",
    createdAt: new Date().toISOString(),
    mood: "happy"
  }
];

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { message } = req.body;
      
      if (!message || message.chat.id.toString() !== YOUR_CHAT_ID) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const chatId = message.chat.id;
      const text = message.text;

      // Initialize user session
      if (!userSessions[chatId]) {
        userSessions[chatId] = {
          state: 'idle',
          currentPost: {}
        };
      }

      const session = userSessions[chatId];

      // Handle /new_post command
      if (text === '/new_post' || text === '/start') {
        session.state = 'awaiting_title';
        session.currentPost = {
          id: Date.now(),
          title: '',
          content: '',
          createdAt: new Date().toISOString(),
          mood: 'neutral'
        };
        
        await sendTelegramMessage(chatId, '📝 <b>DigitalJournal New Entry</b>\n\nPlease enter your journal title:');
        return res.status(200).json({ status: 'awaiting_title' });
      }

      // Handle title input
      if (session.state === 'awaiting_title') {
        session.currentPost.title = text;
        session.state = 'awaiting_content';
        
        await sendTelegramMessage(chatId, '✍️ <b>Title saved!</b>\n\nNow please write your journal content:');
        return res.status(200).json({ status: 'awaiting_content' });
      }

      // Handle content input
      if (session.state === 'awaiting_content') {
        session.currentPost.content = text;
        session.state = 'idle';
        
        // Save the journal
        journals.unshift(session.currentPost);
        
        // Keep only last 100 journals
        if (journals.length > 100) {
          journals = journals.slice(0, 100);
        }
        
        await sendTelegramMessage(chatId, '✅ <b>Journal published!</b>\n\nYour entry is now live on your website.\n\nUse /new_post to create another entry.');
        return res.status(200).json({ status: 'journal_created' });
      }

      // Default response
      await sendTelegramMessage(chatId, '📔 <b>DigitalJournal Bot</b>\n\nUse /new_post to create a new journal entry.');
      return res.status(200).json({ status: 'ok' });

    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'GET') {
    // Return all journals for the website
    return res.status(200).json(journals);
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
