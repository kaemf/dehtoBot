import axios from "axios";
import Context from "telegraf/typings/context";
import { Update } from "telegraf/typings/core/types/typegram";
import { Telegraf } from "telegraf/typings/telegraf";
import { confirmationChat, devChat, eugeneChat, supportChat } from "../general/chats";

export default async function NotificationReg(ctx: Context<Update>, token: string, file: string){
    const photoUrl = `https://api.telegram.org/file/bot${token}/${(await ctx.telegram.getFile(file)).file_path}`,
        response = await axios.get(photoUrl, { responseType: 'arraybuffer' }),
        photoBuffer = Buffer.from(response.data, 'binary');

    return { source: photoBuffer };
}

export function SendNotification(notifbot: Telegraf<Context<Update>>, message: string){
    notifbot.telegram.sendMessage(devChat, message, {parse_mode: "HTML"});

    notifbot.telegram.sendMessage(confirmationChat, message, {parse_mode: "HTML"});

    notifbot.telegram.sendMessage(supportChat, message, {parse_mode: "HTML"});

    notifbot.telegram.sendMessage(eugeneChat, message, {parse_mode: "HTML"});
}