import axios from "axios";
import Context from "telegraf/typings/context";
import { Update } from "telegraf/typings/core/types/typegram";

export default async function NotificationReg(ctx: Context<Update>, token: string, file: string){
    const photoUrl = `https://api.telegram.org/file/bot${token}/${(await ctx.telegram.getFile(file)).file_path}`,
        response = await axios.get(photoUrl, { responseType: 'arraybuffer' }),
        photoBuffer = Buffer.from(response.data, 'binary');

    return { source: photoBuffer };
}