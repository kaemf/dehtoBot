export default function convertPaymentPerLesson(packet: string){
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