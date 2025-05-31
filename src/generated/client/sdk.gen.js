// Generated SDK for API client

import { client } from '../../lib/c360-api';
import type { 
  GetV1UserByIdOrganisationsData, 
  GetV1UserByIdOrganisationsResponse, 
  GetV1UserByIdOrganisationsError 
} from './types.gen';

type Options<TData, ThrowOnError extends boolean = false> = {
  client?: typeof client;
} & Omit<TData, 'url'>;

export const getV1UserByIdOrganisations = <ThrowOnError extends boolean = false>(
  options: Options<GetV1UserByIdOrganisationsData, ThrowOnError>
) => {
  const { client: customClient, ...restOptions } = options;
  
  return (customClient ?? client).get<
    GetV1UserByIdOrganisationsResponse, 
    GetV1UserByIdOrganisationsError, 
    ThrowOnError
  >({
    security: [
      {
        name: 'Authorization',
        type: 'apiKey'
      },
      {
        name: 'API-KEY',
        type: 'apiKey'
      }
    ],
    url: '/v1/user/{id}/organisations',
    ...restOptions
  });
}; 