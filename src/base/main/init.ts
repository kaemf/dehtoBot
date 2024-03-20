// DehtoBot for dehto German Course
// Developed by Yaroslav Volkivskyi (TheLaidSon)

// Actual v4.13.0

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
  const dbclub = await connectToClubDB();

  console.log("Creating telegraf bot instanse...");
  // prod
  // const token : string = '6503582186:AAF-dg1FCpXR0jI_tXXoeEpw7lFJSmbwGUs';
  // dev
  const token : string = '6192445742:AAHSlflbQoeylaqx3hZAh0WkS3fZ1Bt8sdU';
  const bot = new Telegraf(token);
  console.log("Done\n");

  console.warn('\n\n  BOT READY TO WORK!\n\n')

  // wrap redis with helper functions
  const wRedis = ({
    getAll: (id: number) => async () => redis.hGetAll(`${id}`),
    get: (id: number) => async (property: string) => await redis.hGet(`${id}`, property),
    set: (id: number) => (property: string) => async (new_value: string) => await redis.hSet(`${id}`, property, new_value)
  })

  return [bot, wRedis, dbclub] as const;
}