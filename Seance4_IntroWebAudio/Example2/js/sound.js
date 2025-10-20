export default class Sound {
    decodedSound;
    leftTrimbarX;
    rightTrimbarX;
    constructor(decodedSound, rightTrimbarX) {
        this.decodedSound = decodedSound;
        this.leftTrimbarX = 0;
        this.rightTrimbarX = rightTrimbarX;
    }
}
