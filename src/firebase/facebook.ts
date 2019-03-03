import { FB } from 'fb';
import { Config } from '../config';

export const facebookPoster = {
  postTopOnFacebook: (topText: string) => {
    FB.setAccessToken('EAACEc1ZBREUQBAGxtqmZB2IfEAwlToBvSYbsgZB7LLzQ9hgUED0I6ZBYPeKPJFPR6v4EILwNJEBP78e7lobj5ImjYbEYHNMKzlNFkRWK0HwgUUBdg5hadYK9hZAkY9seYJazB87ZBktiwN3ZBDgtZCSOLi8uwzQVGJsSnf1k33YdzgZDZD');

    FB.api('200039413680250/feed', 'post', { message: topText }, (res: any) => {
      if (!res || res.error) {
        Config.logger.info(!res ? 'error occurred' : res.error);

        return;
      }

      Config.logger.info(`Post id : ${res.id}`);
    });
  }
};
