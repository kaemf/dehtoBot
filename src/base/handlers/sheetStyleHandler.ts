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

export function getBordersCell(topBorder: string | null, bottomBorder: string | null, leftBorder: string | null, rightBorder: string | null){
    return {
        top: topBorder !== null ? { style: topBorder } : {}, // (SOLID, DOTTED, DASHED)
        bottom: bottomBorder !== null ? { style: bottomBorder } : {},
        left: leftBorder !== null ? { style: leftBorder } : {},
        right: rightBorder !== null ? { style: rightBorder } : {},
    }
}