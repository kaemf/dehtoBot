const formattedName = (name : String) => {
    const words = name.split(' ');

    const formattedWords = words.map(word => {
        const firstLetter = word.charAt(0).toUpperCase(),
        restOfWord = word.slice(1).toLowerCase();
        return firstLetter + restOfWord;
    });

    return formattedWords.join(' ');
}

export default formattedName;