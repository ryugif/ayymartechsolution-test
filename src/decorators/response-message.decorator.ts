import { SetMetadata } from '@nestjs/common';
export const RESPONSE_MESSAGE_KEY = 'responseMessage';
export const SKIP_ENVELOPE_KEY = 'skipEnvelope';
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE_KEY, true);
