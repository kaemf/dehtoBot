// else if (data.text === 'Разове заняття (300uah)' || data.text === 'Пакет занять (280uah)'){

export function ConvertToPrice(packet: string){
    switch (packet){
        case 'Разове заняття':
            return 300;
        
        case "Пакет занять (280uah)":
            return 280;
            
        case "Разове заняття (300uah)":
            return 300;

        case "Шпрах клуб":
            return 280;

        case "Шпрах клуб плюс":
            return 280;

        default:
            return -1;
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