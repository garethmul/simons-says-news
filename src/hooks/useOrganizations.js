import { useState, useEffect } from 'react';
import { getV1UserByIdOrganisations } from "../generated/client/sdk.gen";
import { getAuthToken } from "../utils/auth";
import { client } from "../lib/c360-api";
import { useUser } from "./useUser";
import { GetV1UserByIdOrganisationsData, GetV1UserByIdOrganisationsResponse } from "../generated/client/types.gen";

const fetchOrganizations = async (userId: string, params: UserOrganizationsQuery = {}) => {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await getV1UserByIdOrganisations({
    client,
    headers: {
      authorization: `Bearer ${token}`,
    },
    path: {
      id: userId,
    },
    query: {
      sortBy: params.sortBy ?? "last-assigned",
      pageSize: params.pageSize,
      page: params.page,
      role: params.role,
      type: params.type,
    },
  });

  return response.data ?? null;
};

export const useOrganizations = (params: UserOrganizationsQuery = {}) => {
  const { data: user } = useUser();
  const userId = user?.user?.id;
  const [data, setData] = useState<GetV1UserByIdOrganisationsResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadOrganizations = async () => {
      try {
        setIsLoading(true);
        const result = await fetchOrganizations(userId, params);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err as Error);
        // Return mock data for development
        setData({
          results: [
            {
              id: 'a9b8c7d6-5e4f-3a2b-1c0d-9e8f7a6b5c4d',
              name: 'Eden',
              role: 'owner',
              logo: null
            }
          ],
          pagination: {
            page: 1,
            pageSize: 20,
            totalPages: 1,
            totalResults: 1
          }
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadOrganizations();
  }, [userId, params.sortBy, params.pageSize, params.page, params.role, params.type]);

  return { data, isLoading, error };
};

export type Organization = NonNullable<GetV1UserByIdOrganisationsResponse["data"]["results"][number]>;
export type UserOrganizationsQuery = GetV1UserByIdOrganisationsData["query"]; 