import axios from "axios";
import Context from "telegraf/typings/context";
import { Update } from "telegraf/typings/core/types/typegram";
import { Telegraf } from "telegraf/typings/telegraf";
import { confirmationChat, devChat, eugeneChat, supportChat } from "../general/chats";

export default async function NotificationReg(ctx: Context<Update>, token: string, file: string){
    // const photoUrl = `https://api.telegram.org/file/bot${token}/${(await ctx.telegram.getFile(file)).file_path}`,
    //     response = await axios.get(photoUrl, { responseType: 'arraybuffer' }),
    //     photoBuffer = Buffer.from(response.data, 'binary');

    // return { source: photoBuffer };

    try {
        const photoFile = await ctx.telegram.getFile(file);
        const photoUrl = `https://api.telegram.org/file/bot${token}/${photoFile.file_path}`;
        
        // Загрузка изображения с сервера первого бота
        const response = await axios.get(photoUrl, { responseType: 'arraybuffer' });

        // Отправка изображения на сервер второго бота
        const targetBotUrl = 'URL_второго_бота_для_получения_файла';
        const result = await axios.post(targetBotUrl, response.data, {
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            responseType: 'arraybuffer'
        });

        // Возвращаем файл в виде буфера для отправки
        return { source: Buffer.from(result.data, 'binary') };
    } catch (error) {
        console.error('Ошибка при передаче изображения между ботами:', error);
        throw new Error('Произошла ошибка при передаче изображения между ботами.');
    }
}

export function SendNotification(notifbot: Telegraf<Context<Update>>, message: string){
    notifbot.telegram.sendMessage(devChat, message, {parse_mode: "HTML"});

    notifbot.telegram.sendMessage(confirmationChat, message, {parse_mode: "HTML"});

    notifbot.telegram.sendMessage(supportChat, message, {parse_mode: "HTML"});

    notifbot.telegram.sendMessage(eugeneChat, message, {parse_mode: "HTML"});
}