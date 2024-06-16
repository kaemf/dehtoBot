// DehtoBot for dehto German School
// Developed by Yaroslav Volkivskyi (TheLaidSon)

// Actual v2.2 Rebirth

// Initialization File

import { Telegraf } from "telegraf";
import { createClient } from "redis";
import { MongoClient } from "mongodb";
import { versionBot } from "../../data/general/chats";

async function connectToClubDB() {
  try {
    const client = new MongoClient('mongodb://localhost:27017/?family=4');

    await client.connect();

    console.log("Done");
    return client;
  } catch (error) {
    console.error('\n\nFatal Error to connect to MongoDB:\n', error);
    process.exit(1);
  }
}

export default async function init() {

  console.log(`\n     DehtoBot ${versionBot}\n\n   Developed by Yaroslav Volkivskyi (TheLaidSon)\n\n\n`);

  console.log("Creating redis client...");
  const redis = createClient();
  redis.on("error", (err) => console.log("Redis Client Error", err));
  console.log("Done");

  console.log("Connecting to redis server...");
  await redis.connect();
  console.log("Done");

  console.log("Connecting to mongodb...")
  const botdb = await connectToClubDB();

  console.log("Creating telegraf bots instanse...");
  // prod
  // const token : string = '6503582186:AAF-dg1FCpXR0jI_tXXoeEpw7lFJSmbwGUs';
  // notif
  const notiftoken : string = '7149519033:AAE2qO_VxWQVaBDt7mUJ0SZIZ5zS50Hlo-8';
  // dev
  const token : string = '6192445742:AAHSlflbQoeylaqx3hZAh0WkS3fZ1Bt8sdU';
  // closed_test
  // const token : string = '6514563411:AAEjGHaHZMCqu0me9snBZlb0oOywxoWXxCQ'
  const bot = new Telegraf(token),
    bot_notification = new Telegraf(notiftoken);
  console.log("Done\n");

  bot.use(async (ctx, next) => {
    const originalSendMessage = ctx.telegram.sendMessage;
    const originalReply = ctx.reply;
    ctx.telegram.sendMessage = async (chatId: string | number, text: string, extra?: any) => {
      let finalExtra = { ...extra, parse_mode: 'HTML' };
      if (extra && !extra.reply_markup) {
        finalExtra.reply_markup = { remove_keyboard: true };
      }
      return originalSendMessage.call(ctx.telegram, chatId, text, finalExtra);
    };

    ctx.reply = async (text: string, extra?: any) => {
      let finalExtra = { ...extra, parse_mode: 'HTML' };
      if (extra && !extra.reply_markup) {
        finalExtra.reply_markup = { remove_keyboard: true };
      }
      return originalReply.call(ctx, text, finalExtra);
    };

    await next();
  })

  console.warn('\n\n  BOT READY TO WORK!\n\n')

  // wrap redis with helper functions
  const wRedis = ({
    getAll: (id: number) => async () => redis.hGetAll(`${id}`),
    get: (id: number) => async (property: string) => await redis.hGet(`${id}`, property),
    set: (id: number) => (property: string) => async (new_value: string) => await redis.hSet(`${id}`, property, new_value)
  })

  return [bot, bot_notification, token, wRedis, botdb] as const;
}