const students = [
    { name: "Vaani", initials: "VP", color: "#ff7043" },
    { name: "Jagger", initials: "JS", color: "#80cbc4" },
    { name: "Krue", initials: "KD", color: "#fff176" },
    { name: "Malina", initials: "MO", color: "#ba68c8" },
    { name: "Julian", initials: "JW", color: "#81c784" },
    { name: "Reece", initials: "RS", color: "#64b5f6" },
    { name: "Johnathan", initials: "JV", color: "#ff8a65" },
    { name: "Alaric", initials: "AC", color: "#4fc3f7" },
    { name: "Everett", initials: "EJ", color: "#795548" },
    { name: "P.J.", initials: "PJ", color: "#afb42b" },
    { name: "Apollo", initials: "AN", color: "#26a69a" },
    { name: "Messiah", initials: "MC", color: "#ffa726" },
    { name: "Lily", initials: "LC", color: "#9575cd" },
    { name: "Aidan", initials: "AA", color: "#ef5350" },
    { name: "Paxton", initials: "PR", color: "#dce775" },
    { name: "Dean", initials: "DJ", color: "#455a64" },
    { name: "Raelynn", initials: "RC", color: "#f06292" },
    { name: "Adalynn", initials: "AT", color: "#e57373" },
    { name: "Phoebe", initials: "PT", color: "#d4e157" },
    { name: "Everleigh", initials: "EG", color: "#ce93d8" },
    { name: "Gavin", initials: "GV", color: "#4fc3f7" },
    { name: "Kota", initials: "KT", color: "#4db6ac" }
];

function getContrastColor(hexColor) {
    // Remove the hash if it exists
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate relative luminance
    // Using standard relative luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // If luminance is high, return dark text, else return white
    return luminance > 0.65 ? '#333333' : '#ffffff';
}
