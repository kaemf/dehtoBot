class StandartCheckException{
    public VideoException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number, polls: string }): boolean {
      if (data.phone_number === '' && data.photo === '' && 
      data.text === '' && data.file === '' && 
      data.stickers === '' && data.location === -1 && 
      data.polls === '' && data.video !== ''){
        return true;
      }
      else return false;
    }

    public PhotoException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number, polls: string }): boolean {
      if (data.phone_number === '' && data.text === '' && 
      data.file === '' && data.stickers === '' && 
      data.video === '' && data.polls === '' &&
      data.location === -1 && data.photo !== ''){
        return true;
      }
      else return false;
    }

    public FileException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number, polls: string }): boolean {
      if (data.phone_number === '' && data.photo === '' && 
      data.text === '' && data.stickers === '' && 
      data.video === '' && data.location === -1 &&
      data.polls === '' && data.file !== ''){
        return true;
      }
      else return false;
    }

    public TextException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number, polls: string }): boolean {
      if (data.phone_number === '' && data.photo === '' && 
      data.file === '' && data.stickers === '' && 
      data.video === '' && data.location === -1 &&
      data.polls === '' && data.text !== ''){
        return true;
      }
      else return false;
    }

    public StickerException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number, polls: string }): boolean {
      if (data.phone_number === '' && data.photo === '' && 
      data.text === '' && data.file === '' && 
      data.video === '' && data.location === -1 &&
      data.polls === '' && data.stickers !== ''){
        return true;
      }
      else return false;
    }

    public LocationException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number, polls: string }): boolean {
      if (data.phone_number === '' && data.photo === '' && 
      data.text === '' && data.file === '' && 
      data.video === '' && data.stickers === '' &&
      data.polls === '' && data.location !== -1){
        return true;
      }
      else return false;
    }

    public PollsException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number, polls: string }): boolean {
      if (data.phone_number === '' && data.photo === '' && 
      data.text === '' && data.file === '' && 
      data.video === '' && data.location === -1 &&
      data.stickers === '' && data.polls !== ''){
        return true;
      }
      else return false;
    }

    public PhoneException(data: { phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number, polls: string }): boolean {
      if (data.phone_number !== '' && data.photo === '' && 
      data.text === '' && data.file === '' && 
      data.video === '' && data.location === -1 &&
      data.stickers === '' && data.polls === ''){
        return true;
      }
      else return false;
    }
}

export const CheckException : StandartCheckException = new StandartCheckException();