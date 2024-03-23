interface dataType{
  phone_number: string; 
  text: string, 
  photo: string, 
  file: string, 
  stickers: string, 
  video: string, 
  location: number[], 
  polls: string;
  voice: string; 
  audio: string;
  video_circle: string;
}

class StandartCheckException{
  public VideoException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number[], polls: string, voice: string, audio: string, video_circle: string }): boolean {
    if (data.phone_number === '' && data.photo === '' && 
    data.text === '' && data.file === '' && 
    data.stickers === '' && data.location[0] === -1 && 
    data.polls === '' && data.video !== '' &&
    data.voice === '' && data.audio === '' && data.video_circle === ''){
      return true;
    }
    else return false;
  }

  public PhotoException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number[], polls: string, voice: string, audio: string, video_circle: string }): boolean {
    if (data.phone_number === '' && data.text === '' && 
    data.file === '' && data.stickers === '' && 
    data.video === '' && data.polls === '' &&
    data.location[0] === -1 && data.photo !== '' &&
    data.voice === '' && data.audio === '' && data.video_circle === ''){
      return true;
    }
    else return false;
  }

  public FileException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number[], polls: string, voice: string, audio: string, video_circle: string }): boolean {
    if (data.phone_number === '' && data.photo === '' && 
    data.text === '' && data.stickers === '' && 
    data.video === '' && data.location[0] === -1 &&
    data.polls === '' && data.file !== '' &&
    data.voice === '' && data.audio === '' && data.video_circle === ''){
      return true;
    }
    else return false;
  }

  public TextException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number[], polls: string, voice: string, audio: string, video_circle: string }): boolean {
    if (data.phone_number === '' && data.photo === '' && 
    data.file === '' && data.stickers === '' && 
    data.video === '' && data.location[0] === -1 &&
    data.polls === '' && data.text !== '' &&
    data.voice === '' && data.audio === '' && data.video_circle === ''){
      return true;
    }
    else return false;
  }

  public StickerException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number[], polls: string, voice: string, audio: string, video_circle: string }): boolean {
    if (data.phone_number === '' && data.photo === '' && 
    data.text === '' && data.file === '' && 
    data.video === '' && data.location[0] === -1 &&
    data.polls === '' && data.stickers !== '' &&
    data.voice === '' && data.audio === '' && data.video_circle === ''){
      return true;
    }
    else return false;
  }

  public LocationException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number[], polls: string, voice: string, audio: string, video_circle: string }): boolean {
    if (data.phone_number === '' && data.photo === '' && 
    data.text === '' && data.file === '' && 
    data.video === '' && data.stickers === '' &&
    data.polls === '' && data.location[0] !== -1 &&
    data.voice === '' && data.audio === '' && data.video_circle === ''){
      return true;
    }
    else return false;
  }

  public PollsException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number[], polls: string, voice: string, audio: string, video_circle: string }): boolean {
    if (data.phone_number === '' && data.photo === '' && 
    data.text === '' && data.file === '' && 
    data.video === '' && data.location[0] === -1 &&
    data.stickers === '' && data.polls !== '' &&
    data.voice === '' && data.audio === '' && data.video_circle === ''){
      return true;
    }
    else return false;
  }

  public PhoneException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number[], polls: string, voice: string, audio: string, video_circle: string }): boolean {
    if (data.phone_number !== '' && data.photo === '' && 
    data.text === '' && data.file === '' && 
    data.video === '' && data.location[0] === -1 &&
    data.stickers === '' && data.polls === '' &&
    data.voice === '' && data.audio === '' && data.video_circle === ''){
      return true;
    }
    else return false;
  }

  public AudioException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number[], polls: string, voice: string, audio: string, video_circle: string }): boolean {
    if (data.phone_number === '' && data.photo === '' && 
    data.text === '' && data.file === '' && 
    data.video === '' && data.location[0] === -1 &&
    data.stickers === '' && data.polls === '' &&
    data.voice === '' && data.audio !== '' && data.video_circle === ''){
      return true;
    }
    else return false;
  }

  public VideoNoteException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number[], polls: string, voice: string, audio: string, video_circle: string }): boolean {
    if (data.phone_number === '' && data.photo === '' && 
    data.text === '' && data.file === '' && 
    data.video === '' && data.location[0] === -1 &&
    data.stickers === '' && data.polls === '' &&
    data.voice === '' && data.audio === '' && data.video_circle !== ''){
      return true;
    }
    else return false;
  }

  public BackRoot(data: dataType){
    if (this.TextException(data) && data.text === '/back'){
      return true;
    }
    else return false;
  }
}

export const CheckException : StandartCheckException = new StandartCheckException();