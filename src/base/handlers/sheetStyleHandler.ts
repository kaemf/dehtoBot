export function getColorCell(color: string){
    let red, green, blue;
    if (color === 'white'){
        red = 1.0;
        green = 1.0;
        blue = 1.0;
    }
    else if (color === 'red'){
        red = 1.0;
        green = 0.2;
        blue = 0.2;
    }
    else if (color === 'green'){
        red = 0.2;
        green = 1.0;
        blue = 0.2;
    }

    return {red: red, green: green, blue: blue}
}

export function getBordersCell(topBorder: string | null,
    bottomBorder: string | null,
    leftBorder: string | null, 
    rightBorder: string | null,){
    return {
        ...(topBorder !== null ? { top: { style: topBorder } } : {}), // ( "DOTTED", "DASHED", "SOLID", "NONE", "DOUBLE")
        ...(bottomBorder !== null ? { bottom: { style: bottomBorder } } : {}),
        ...(leftBorder !== null ? { left: { style: leftBorder } } : {}),
        ...(rightBorder !== null ? { right: { style: rightBorder } } : {}),
    }
}