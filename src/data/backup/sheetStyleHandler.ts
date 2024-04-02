// export function getColorCell(color: string){
//     let red, green, blue;

//     switch(color){
//         case "white":
//             red = 1.0;
//             green = 1.0;
//             blue = 1.0;
//             break;

//         case "red":
//             red = 1.0;
//             green = 0.2;
//             blue = 0.2;
//             break;

//         case "green":
//             red = 0.2;
//             green = 1.0;
//             blue = 0.2;
//             break;

//         default:
//             red = 1.0;
//             green = 1.0;
//             blue = 1.0;
//             break;
//     }

//     return {red: red, green: green, blue: blue}
// }

// export function getBordersCell(topBorder: string | null,
//     bottomBorder: string | null,
//     leftBorder: string | null, 
//     rightBorder: string | null,){
//     return {
//         ...(topBorder !== null ? { top: { style: topBorder } } : {}), // ( "DOTTED", "DASHED", "SOLID", "NONE", "DOUBLE")
//         ...(bottomBorder !== null ? { bottom: { style: bottomBorder } } : {}),
//         ...(leftBorder !== null ? { left: { style: leftBorder } } : {}),
//         ...(rightBorder !== null ? { right: { style: rightBorder } } : {}),
//     }
// }