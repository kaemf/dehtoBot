// else if (data.text === 'Разове заняття (300uah)' || data.text === 'Пакет занять (280uah)'){

export function ConvertToPrice(packet: string){
    if (packet === 'Разове заняття (300uah)'){
        return 300;
    }
    else if (packet === 'Пакет занять (280uah)'){
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
    else if (!source){
        return 'Відсутній';
    }
    else{
        return source;
    }
}