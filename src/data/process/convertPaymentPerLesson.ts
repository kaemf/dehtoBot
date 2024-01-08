export function ConvertToPrice(packet: string){
    if (packet === 'РазовеЗаняття'){
        return 300;
    }
    else if (packet === 'Шпрах-Клуб' || packet === 'Шпрах-Клуб+PLUS'){
        return 280;
    }
    else{
        return null;
    }
}

export function ConvertToPacket(source: string){
    if (source === 'РазовеЗаняття'){
        return 'Разове заняття';
    }
    else if (source === undefined || source === null || source === ''){
        return 'Відсутній';
    }
    else{
        return source;
    }
}