import { createMusicUploadHandler } from './handler.mjs';

const handle = createMusicUploadHandler();

export default {
  fetch(request, env) {
    return handle(request, env);
  }
};
