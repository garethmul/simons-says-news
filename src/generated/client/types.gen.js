// Generated types for API client

export type GetV1UserByIdOrganisationsData = {
    body?: never;
    headers: {
        authorization: string;
        'device-id'?: string;
    };
    path: {
        id: string;
    };
    query?: {
        page?: number;
        pageSize?: number;
        role?: ('admin' | 'member' | 'owner' | 'recruiter') | 'all';
        sortBy?: 'last-assigned' | 'first-assigned' | 'last-created' | 'first-created' | 'name-asc' | 'name-desc';
        type?: ('individual_ministry' | 'church' | 'charity' | 'business' | 'other' | 'personal') | 'all';
    };
    url: '/v1/user/{id}/organisations';
};

export type GetV1UserByIdOrganisationsErrors = {
    /**
     * Bad Request
     */
    400: {
        statusCode: 400;
        error: 'Bad Request';
        message: string;
        /**
         * A code that can be used to look up the message in a translation file
         */
        messageCode?: string | null;
        /**
         * An array of zod issues that describe the validation errors
         */
        issues?: unknown;
    };
    /**
     * Unauthorised
     */
    403: {
        statusCode: 403;
        error: 'Unauthorised';
        message: string;
        /**
         * A code that can be used to look up the message in a translation file
         */
        messageCode?: string | null;
        /**
         * An array of zod issues that describe the validation errors
         */
        issues?: unknown;
    };
    /**
     * Internal Server Error
     */
    500: {
        statusCode: 500;
        error: 'Internal Server Error';
        message: string;
        /**
         * A code that can be used to look up the message in a translation file
         */
        messageCode?: string | null;
        /**
         * An array of zod issues that describe the validation errors
         */
        issues?: unknown;
    };
};

export type GetV1UserByIdOrganisationsError = GetV1UserByIdOrganisationsErrors[keyof GetV1UserByIdOrganisationsErrors];

export type GetV1UserByIdOrganisationsResponses = {
    /**
     * Successful response with pagination
     */
    200: {
        data: {
            results: Array<{
                id: string;
                name: string;
                role: 'admin' | 'member' | 'owner' | 'recruiter';
                logo: {
                    url: string;
                } | null;
            }>;
            pagination: {
                /**
                 * Current page number
                 */
                page: number;
                /**
                 * Maximum number of results per page
                 */
                pageSize: number;
                /**
                 * Maximum page number with the current page size
                 */
                totalPages: number;
                /**
                 * Maximum results regardless of page size
                 */
                totalResults: number;
            };
        };
    };
};

export type GetV1UserByIdOrganisationsResponse = GetV1UserByIdOrganisationsResponses[keyof GetV1UserByIdOrganisationsResponses]; 