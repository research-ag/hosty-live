import { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { AxiosError } from "axios";

type PreparedQueryResult<O extends string, AT, T> = Record<
  `${O}${"IsLoading" | "IsFirstLoading" | "IsError"}`,
  boolean
> &
  Record<`${O}${"FetchError"}`, Error> &
  Record<`${O}${"Refetch"}`, UseQueryResult<T, unknown>["refetch"]> &
  Record<O, AT>;

/**
 * Mapper for result of UseQuery hook. Recommended to use with react-query in API layer.
 * @param entity base key for query result, for example: 'attachments', 'educations', etc.
 * @param result result of UseQuery hook
 * @returns prepared query result for using in client code
 */
export const prepareQueryResult = <
  O extends string,
  T,
  D extends AT,
  N extends true | undefined,
  AT = [N] extends [true] ? T | null : T
>(
  entity: O,
  result: UseQueryResult<T, unknown>,
  defaultValue: D,
  _nullable?: N
): PreparedQueryResult<O, AT, T> =>
  ({
    [entity]: result.data ?? defaultValue,
    [`${entity}IsLoading`]: result.isFetching,
    [`${entity}IsFirstLoading`]: result.isLoading,
    [`${entity}IsError`]: result.isError,
    [`${entity}FetchError`]: result.error,
    [`${entity}Refetch`]: result.refetch,
  } as PreparedQueryResult<O, AT, T>);

type PreparedMutation<O extends string, D, P> = Record<
  `${O}${"Loading" | "Error"}`,
  boolean
> &
  Record<`${O}${"ErrorObj"}`, unknown> &
  Record<`${O}${"ErrorMessage"}`, string> &
  Record<
    `${O}${"Async"}`,
    UseMutationResult<D, unknown, P, unknown>["mutateAsync"]
  > &
  Record<O, UseMutationResult<D, unknown, P, unknown>["mutate"]>;

/**
 * Mapper for result of useMutation hook. Recommended to use with react-query in API layer.
 * @param mutateKey base key for mutation, for example 'createEducation', 'deleteCandidateProject', etc.
 * @param mutation result of useMutation hook
 * @returns prepared mutation for using in client code
 */
export const prepareMutation = <O extends string, D, P>(
  mutateKey: O,
  mutation: UseMutationResult<D, unknown, P, unknown>
): PreparedMutation<O, D, P> =>
  ({
    [mutateKey]: mutation.mutate,
    [`${mutateKey}Async`]: mutation.mutateAsync,
    [`${mutateKey}Loading`]: mutation.isPending,
    [`${mutateKey}Error`]: mutation.isError,
    [`${mutateKey}ErrorObj`]: mutation.error,
    [`${mutateKey}ErrorMessage`]:
      ((mutation.error as AxiosError)?.response?.data as { message: string })
        ?.message || "",
  } as PreparedMutation<O, D, P>);
