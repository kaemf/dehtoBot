import Context from "telegraf/typings/context";
import { Update } from "telegraf/typings/core/types/typegram";
import { Telegraf } from "telegraf/typings/telegraf";
import { confirmationChat, devChat, eugeneChat, supportChat } from "../general/chats";
type HideableIKBtn = ReturnType<typeof Markup.button.callback>;
import { Markup } from "telegraf";

export default async function NotificationReg(ctx: Context<Update>, token: string, file: string){
    return { url: `https://api.telegram.org/file/bot${token}/${(await ctx.telegram.getFile(file)).file_path}` };
}

export function SendNotification(notifbot: Telegraf<Context<Update>>, message: string, debug?: boolean){
    if (debug){
        notifbot.telegram.sendMessage(devChat, message, {parse_mode: "HTML"});    
    }
    else{
        notifbot.telegram.sendMessage(devChat, message, {parse_mode: "HTML"});
    
        notifbot.telegram.sendMessage(confirmationChat, message, {parse_mode: "HTML"});
    
        notifbot.telegram.sendMessage(supportChat, message, {parse_mode: "HTML"});
    
        notifbot.telegram.sendMessage(eugeneChat, message, {parse_mode: "HTML"});
    }
}

export function SendNotificationWithMedia(notifbot: Telegraf<Context<Update>>, message: string, url: string, type: string, debug?: boolean){
    switch(type){
        case "photo":
            if (debug){
                notifbot.telegram.sendPhoto(devChat, { url: url }, {caption: message, parse_mode: "HTML"});
            }
            else{
                notifbot.telegram.sendPhoto(devChat, { url: url }, {caption: message, parse_mode: "HTML"});
        
                notifbot.telegram.sendPhoto(confirmationChat, { url: url }, {caption: message, parse_mode: "HTML"});
            
                notifbot.telegram.sendPhoto(supportChat, { url: url }, {caption: message, parse_mode: "HTML"});
            
                notifbot.telegram.sendPhoto(eugeneChat, { url: url }, {caption: message, parse_mode: "HTML"});
            }
            break;

        case "document":
            if (debug){
                notifbot.telegram.sendDocument(devChat, { url: url }, {caption: message, parse_mode: "HTML"});
            }
            else{
                notifbot.telegram.sendDocument(devChat, { url: url }, {caption: message, parse_mode: "HTML"});
        
                notifbot.telegram.sendDocument(confirmationChat, { url: url }, {caption: message, parse_mode: "HTML"});
            
                notifbot.telegram.sendDocument(supportChat, { url: url }, {caption: message, parse_mode: "HTML"});
            
                notifbot.telegram.sendDocument(eugeneChat, { url: url }, {caption: message, parse_mode: "HTML"});
            }
            break;

        default:
            throw new Error('Uncorrect parametr in SendNotificationWithMedia(). Parametr type: ' + type);
    }
}

export function SendNotificationWithMediaAndKeyboard(notifbot: Telegraf<Context<Update>>, message: string, file: {_fileid?: string, url?: string}, type: string, keyboard: HideableIKBtn[][], debug?: boolean){
    switch(type){
        case "photo":
            if (debug){
                notifbot.telegram.sendPhoto(devChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
            }
            else{
                notifbot.telegram.sendPhoto(devChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
        
                notifbot.telegram.sendPhoto(confirmationChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
            
                notifbot.telegram.sendPhoto(supportChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
            
                notifbot.telegram.sendPhoto(eugeneChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
            }
            break;

        case "document":
            if (debug){
                notifbot.telegram.sendDocument(devChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
            }
            else{
                notifbot.telegram.sendDocument(devChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
        
                notifbot.telegram.sendDocument(confirmationChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
            
                notifbot.telegram.sendDocument(supportChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
            
                notifbot.telegram.sendDocument(eugeneChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
            }
            break;

        default:
            throw new Error('Uncorrect parametr in SendNotificationWithMediaAndKeyboard(). Parametr type: ' + type);
    }
}

export function SendClubPaymentNotificationWithMediaAndKeyboard(notifbot: Telegraf<Context<Update>>, message: string, file: {_fileid?: string, url?: string}, type: string, keyboard: HideableIKBtn[][], debug?: boolean){
    switch(type){
        case "photo":
            if (debug){
                notifbot.telegram.sendPhoto(devChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
            }
            else{
                notifbot.telegram.sendPhoto(devChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
        
                notifbot.telegram.sendPhoto(confirmationChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
            }
            break;

        case "document":
            if (debug){
                notifbot.telegram.sendDocument(devChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
            }
            else{
                notifbot.telegram.sendDocument(devChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
        
                notifbot.telegram.sendDocument(confirmationChat, file._fileid ? file._fileid : { url: file.url! }, {caption: message, parse_mode: "HTML", ...Markup.inlineKeyboard(keyboard)});
            }
            break;

        default:
            throw new Error('Uncorrect parametr in SendNotificationWithMediaAndKeyboard(). Parametr type: ' + type);
    }
}