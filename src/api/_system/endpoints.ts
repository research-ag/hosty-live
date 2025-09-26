import {
  QueryClient,
  useMutation as useReactMutation,
  useQuery as useReactQuery,
  useQueryClient,
  UseQueryOptions as ReactUseQueryOptions,
} from "@tanstack/react-query";

import { prepareMutation, prepareQueryResult } from "./prepare";

type OmitKeysStartingWith<T, Prefix extends string> = {
  [K in keyof T as K extends `${Prefix}${string}` ? never : K]: T[K];
};

type UseQueryOptions<T> = OmitKeysStartingWith<
  ReactUseQueryOptions<T, unknown, T, (string | number)[]>,
  `query`
>;

interface QueryEndpointBase<
  Payload,
  Response,
  Entity extends string,
  DefaultValue extends ValueType,
  Nullable extends true | undefined,
  ValueType = [Nullable] extends [true] ? Response | null : Response
> {
  queryKey: (payload: Payload) => Array<string | number>;
  queryFn: (payload: Payload) => Promise<Response>;
  defaultValue: DefaultValue;
  entity: Entity;
  nullable?: Nullable;
  snackbarOnError?: boolean;
}

interface MutationEndpointBase<Payload, Response, ActionName extends string> {
  mutationKey: Array<string | number>;
  mutationFn: (payload: Payload) => Promise<Response>;
  actionName: ActionName;
  onSuccess?: (
    queryClient: QueryClient,
    response: Response,
    payload: Payload
  ) => void;
}

export const queryEndpoint = <
  Payload,
  Response,
  Entity extends string,
  DefaultValue extends ValueType,
  Nullable extends true | undefined,
  ValueType = [Nullable] extends [true] ? Response | null : Response
>(
  base: QueryEndpointBase<
    Payload,
    Response,
    Entity,
    DefaultValue,
    Nullable,
    ValueType
  >
) => {
  const fetch = (queryClient: QueryClient, payload: Payload) =>
    queryClient.fetchQuery({
      queryKey: base.queryKey(payload),
      queryFn: () => base.queryFn(payload),
    });

  const prefetch = (queryClient: QueryClient, payload: Payload) =>
    queryClient.prefetchQuery({
      queryKey: base.queryKey(payload),
      queryFn: () => base.queryFn(payload),
    });

  const useQuery = (payload: Payload, options?: UseQueryOptions<Response>) => {
    // const errorSnackbar = useErrorSnackbar();
    return prepareQueryResult(
      base.entity,
      useReactQuery({
        queryKey: base.queryKey(payload),
        queryFn: () =>
          base.queryFn(payload).catch((err) => {
            if (base.snackbarOnError) {
              // errorSnackbar.show();
            }
            throw err;
          }),
        ...options,
      }),
      base.defaultValue as unknown as Response,
      base.nullable
    );
  };

  return { fetch, prefetch, useQuery };
};

export const mutationEndpoint = <Payload, Response, ActionName extends string>(
  base: MutationEndpointBase<Payload, Response, ActionName>
) => {
  const useMutation = () => {
    const queryClient = useQueryClient();

    return prepareMutation<ActionName, Response, Payload>(
      base.actionName,
      useReactMutation({
        mutationKey: base.mutationKey,
        mutationFn: base.mutationFn,
        ...(base.onSuccess
          ? {
              onSuccess: (response, payload) => {
                base.onSuccess!(
                  queryClient,
                  response as Response,
                  payload as Payload
                );
              },
            }
          : {}),
      })
    );
  };

  return { fn: base.mutationFn, useMutation };
};
