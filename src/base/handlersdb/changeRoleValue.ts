export default function Role(data: string){
    switch(data){
        case "Студент":
            return 'student';

        case "Викладач":
            return 'teacher';

        case "Адмін":
            return 'admin';
        
        default:
            return '';
    }
}

export function ConvertRole(data: string){
    switch(data){
        case "student":
            return 'Студент';

        case "teacher":
            return 'Викладач';

        case "admin":
            return 'Адмін';

        case "developer":
            return 'Розробник'

        case "guest":
            return 'Користувач';

        default:
            return false;
    }
}