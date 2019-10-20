import { FB } from 'fb';
import { Config } from '../config';

export class FacebookHelper {
  public static PostTopOnFacebook(topText: string) {
    FB.setAccessToken('EAACEc1ZBREUQBAJr6Gb5v9gT55NOK5kqATSI1MiOcIzDuMHry5703RcKgQDcNx8DciaTj6jMlJ5HNQZB480su5j1j3ggqDyII0NbsClHEiZAD2ZAqf28hWrzrhHjXgQZAO4zUGqu9ngXBeDflTLa4xJhWs3Y1R4ZAxdCi2OOiosAZDZD');

    FB.api('144181319524102/feed', 'post', {
      message: topText,
      place: '1549669895088252'
    }, (res: any) => {
      if (!res || res.error) {
        Config.logger.info(!res ? 'error occurred' : res.error);

        return;
      }

      Config.logger.info(`Post id : ${res.id}`);
    });
  }
}
