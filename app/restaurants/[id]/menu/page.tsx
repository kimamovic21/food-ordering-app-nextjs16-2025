'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import Link from 'next/link';
import MenuItem from './MenuItem';
import SearchInput from './SearchInput';
import MenuPageSkeleton from './MenuPageSkeleton';
import { prefetchRestaurantOrderingStatuses } from '@/hooks/useRestaurantOrderingGate';
import {
  useRestaurantMenuCategoriesQuery,
  useRestaurantMenuResultsQuery,
  useRestaurantMenuSummaryQuery,
  type RestaurantMenuSort,
} from '@/hooks/useRestaurantMenuQueries';

const SORT_OPTIONS = ['price_asc', 'price_desc', 'newest', 'oldest'] as const;
type SortOption = RestaurantMenuSort;
const DEFAULT_SORT: SortOption = 'newest';

const toCategorySlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const isObjectId = (value: string) => /^[a-f0-9]{24}$/i.test(value);

const RestaurantMenuPage = () => {
  const queryClient = useQueryClient();
  const params = useParams();
  const id = params?.id as string;

  const [
    {
      q: searchQuery,
      categories: categoryQuery,
      sort: sortBy,
      minPrice: minPriceQuery,
      maxPrice: maxPriceQuery,
      page: pageQuery,
    },
    setMenuQuery,
  ] = useQueryStates({
    q: parseAsString.withDefault(''),
    categories: parseAsArrayOf(parseAsString, ',').withDefault([]),
    sort: parseAsStringLiteral(SORT_OPTIONS).withDefault(DEFAULT_SORT),
    minPrice: parseAsString.withDefault(''),
    maxPrice: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
  });
  const page = Math.max(1, pageQuery);
  const activeSearch = searchQuery.trim();
  const minPrice = minPriceQuery.trim();
  const maxPrice = maxPriceQuery.trim();
  const [searchInput, setSearchInput] = useState('');

  const [pendingSelectedCategories, setPendingSelectedCategories] = useState<string[]>([]);
  const [pendingSortBy, setPendingSortBy] = useState<SortOption>(DEFAULT_SORT);
  const [pendingMinPrice, setPendingMinPrice] = useState('');
  const [pendingMaxPrice, setPendingMaxPrice] = useState('');

  const pageSize = 10;
  const categoriesQuery = useRestaurantMenuCategoriesQuery(id, Boolean(id));
  const categories = useMemo(() => categoriesQuery.data || [], [categoriesQuery.data]);

  const categoryNameBySlug = useMemo(() => {
    const entries = categories.map((category) => [toCategorySlug(category.name), category.name]);
    return Object.fromEntries(entries);
  }, [categories]);

  const selectedCategories = useMemo(() => {
    const resolvedCategories = categoryQuery
      .map((value) => {
        const trimmedValue = value.trim();

        if (!trimmedValue) {
          return '';
        }

        if (isObjectId(trimmedValue)) {
          const match = categories.find((category) => category._id === trimmedValue);
          return match ? toCategorySlug(match.name) : trimmedValue;
        }

        return toCategorySlug(trimmedValue);
      })
      .filter(Boolean);

    return Array.from(new Set(resolvedCategories));
  }, [categories, categoryQuery]);
  const selectedCategoryKey = selectedCategories.join(',');
  const selectedCategoryValues = useMemo(
    () => (selectedCategoryKey ? selectedCategoryKey.split(',') : []),
    [selectedCategoryKey]
  );

  const isResultsView =
    activeSearch.length > 0 ||
    selectedCategoryValues.length > 0 ||
    minPrice.length > 0 ||
    maxPrice.length > 0 ||
    sortBy !== DEFAULT_SORT;

  const menuResultsParams = useMemo(
    () => ({
      categories: selectedCategoryValues,
      maxPrice,
      minPrice,
      page: 1,
      pageSize: pageSize * page,
      q: activeSearch,
      sort: sortBy,
    }),
    [activeSearch, maxPrice, minPrice, page, pageSize, selectedCategoryValues, sortBy]
  );
  const summaryQuery = useRestaurantMenuSummaryQuery(id, 3, Boolean(id) && !isResultsView);
  const resultsQuery = useRestaurantMenuResultsQuery(
    id,
    menuResultsParams,
    Boolean(id) && isResultsView
  );
  const categorySummaries = summaryQuery.data?.categories || [];
  const results = resultsQuery.data?.items || [];
  const totalResults = resultsQuery.data?.total || 0;
  const isResultsLoading = resultsQuery.isFetching;
  const isUpdatingMenu =
    (summaryQuery.isFetching && !summaryQuery.isLoading) ||
    (resultsQuery.isFetching && !resultsQuery.isLoading);

  useEffect(() => {
    if (!id) {
      return;
    }

    void prefetchRestaurantOrderingStatuses(queryClient, [id]);
  }, [id, queryClient]);

  useEffect(() => {
    setSearchInput(activeSearch);
    setPendingSelectedCategories(selectedCategoryValues);
    setPendingSortBy(sortBy);
    setPendingMinPrice(minPrice);
    setPendingMaxPrice(maxPrice);
  }, [activeSearch, maxPrice, minPrice, selectedCategoryValues, sortBy]);

  useEffect(() => {
    if (categoryQuery.some(isObjectId) && categories.length > 0) {
      void setMenuQuery({ categories: selectedCategoryValues });
    }
  }, [categories.length, categoryQuery, selectedCategoryValues, setMenuQuery]);

  const handleSearch = () => {
    const trimmedSearch = searchInput.trim();
    void setMenuQuery({ q: trimmedSearch || null, page: 1 });
  };

  const handleResetSearch = () => {
    setSearchInput('');
    void setMenuQuery({ q: null, page: 1 });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleApplyFilters = () => {
    void setMenuQuery({
      categories: pendingSelectedCategories.length > 0 ? pendingSelectedCategories : null,
      sort: pendingSortBy === DEFAULT_SORT ? null : pendingSortBy,
      minPrice: pendingMinPrice || null,
      maxPrice: pendingMaxPrice || null,
      page: 1,
    });
  };

  const handleSortChange = (value: SortOption) => {
    setPendingSortBy(value);
  };

  const toggleCategory = (categorySlug: string) => {
    const nextSelected = pendingSelectedCategories.includes(categorySlug)
      ? pendingSelectedCategories.filter((slug) => slug !== categorySlug)
      : [...new Set([...pendingSelectedCategories, categorySlug])];

    setPendingSelectedCategories(nextSelected);
  };

  const handleClearFilters = () => {
    setPendingSelectedCategories([]);
    setPendingSortBy(DEFAULT_SORT);
    setPendingMinPrice('');
    setPendingMaxPrice('');
    void setMenuQuery({
      categories: null,
      sort: null,
      minPrice: null,
      maxPrice: null,
      page: 1,
    });
  };

  const handleClearAll = () => {
    setSearchInput('');
    setPendingSelectedCategories([]);
    setPendingSortBy(DEFAULT_SORT);
    setPendingMinPrice('');
    setPendingMaxPrice('');
    void setMenuQuery({
      q: null,
      categories: null,
      sort: null,
      minPrice: null,
      maxPrice: null,
      page: 1,
    });
  };

  const handleViewMoreCategory = (categorySlug: string) => {
    setPendingSelectedCategories([categorySlug]);
    void setMenuQuery({ categories: [categorySlug], page: 1 });
  };

  const handleLoadMore = () => {
    if (results.length >= totalResults) return;
    const nextPage = page + 1;
    void setMenuQuery({ page: nextPage });
  };

  const hasActiveFilters =
    selectedCategoryValues.length > 0 ||
    minPrice.length > 0 ||
    maxPrice.length > 0 ||
    sortBy !== DEFAULT_SORT;

  const shouldShowSkeleton =
    categoriesQuery.isLoading ||
    (!isResultsView && summaryQuery.isLoading && categorySummaries.length === 0) ||
    (isResultsView && resultsQuery.isLoading && results.length === 0);
  const activeQueryError =
    categoriesQuery.error || (isResultsView ? resultsQuery.error : summaryQuery.error);
  const shouldShowError =
    Boolean(activeQueryError) &&
    (isResultsView ? results.length === 0 : categorySummaries.length === 0);
  const retryMenu = () => {
    void categoriesQuery.refetch();

    if (isResultsView) {
      void resultsQuery.refetch();
    } else {
      void summaryQuery.refetch();
    }
  };

  return (
    <main className='max-w-7xl mx-auto px-4 py-12'>
      {shouldShowSkeleton ? (
        <div className='mb-4 flex items-center gap-2'>
          <Skeleton className='h-4 w-20' />
          <Skeleton className='h-4 w-4' />
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-4 w-4' />
          <Skeleton className='h-4 w-24' />
        </div>
      ) : (
        <Breadcrumb className='mb-4'>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href='/restaurants'>Restaurants</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/restaurants/${id}`}>Restaurant details</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Restaurant menu</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {shouldShowSkeleton ? (
        <MenuPageSkeleton sectionCount={1} cardsPerSection={3} />
      ) : shouldShowError ? (
        <Card className='border-destructive/30 bg-destructive/10 p-8 text-center'>
          <p className='text-sm text-destructive'>
            {activeQueryError instanceof Error
              ? activeQueryError.message
              : 'Failed to load this restaurant menu.'}
          </p>
          <div className='mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center'>
            <Button type='button' variant='outline' onClick={retryMenu}>
              Try again
            </Button>
            <Link href={`/restaurants/${id}`}>
              <Button type='button'>Back to restaurant details</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start'>
            <div className='space-y-10'>
              <div className='space-y-6'>
                <header className='space-y-3'>
                  <div className='flex flex-wrap items-center gap-3'>
                    <h1 className='text-4xl font-bold'>Restaurant Menu</h1>
                    {isUpdatingMenu && <Badge variant='outline'>Updating</Badge>}
                  </div>
                  <p className='text-muted-foreground'>
                    Browse food and drinks available in this restaurant.
                  </p>
                </header>

                <div className='flex flex-col sm:flex-row gap-3 sm:items-center'>
                  <div className='flex-1'>
                    <SearchInput
                      value={searchInput}
                      onChange={setSearchInput}
                      onSearch={handleSearch}
                      onClear={handleResetSearch}
                      onKeyPress={handleKeyPress}
                    />
                  </div>
                  {activeSearch && (
                    <Button
                      onClick={handleResetSearch}
                      variant='outline'
                      className='h-11 px-5'
                      type='button'
                    >
                      Reset search
                    </Button>
                  )}
                </div>

                {(activeSearch || hasActiveFilters) && (
                  <div className='flex flex-wrap items-center gap-2 text-sm'>
                    {activeSearch && <Badge variant='secondary'>Search: {activeSearch}</Badge>}
                    {selectedCategoryValues.map((categorySlug) => (
                      <Badge key={categorySlug} variant='secondary'>
                        {categoryNameBySlug[categorySlug] || categorySlug}
                      </Badge>
                    ))}
                    {minPrice && <Badge variant='secondary'>Min ${minPrice}</Badge>}
                    {maxPrice && <Badge variant='secondary'>Max ${maxPrice}</Badge>}
                    {sortBy !== DEFAULT_SORT && (
                      <Badge variant='secondary'>
                        Sort:{' '}
                        {sortBy === 'price_asc'
                          ? 'Low to high'
                          : sortBy === 'price_desc'
                            ? 'High to low'
                            : sortBy === 'oldest'
                              ? 'Oldest added'
                              : 'Newest added'}
                      </Badge>
                    )}
                    <Button variant='ghost' className='h-8 px-2' onClick={handleClearAll}>
                      Clear all
                    </Button>
                  </div>
                )}
              </div>

              <div className='space-y-10'>
                {isResultsView ? (
                  <section className='space-y-6'>
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
                      <h2 className='text-2xl font-semibold'>Menu results</h2>
                      <span className='text-sm text-muted-foreground'>
                        {totalResults} {totalResults === 1 ? 'item' : 'items'} found
                      </span>
                    </div>

                    {results.length > 0 ? (
                      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {results.map((item) => (
                          <MenuItem key={item._id} item={item} />
                        ))}
                      </div>
                    ) : (
                      <div className='text-center py-10'>
                        <p className='text-muted-foreground'>No menu items match these filters.</p>
                        <Button onClick={handleClearAll} variant='outline' className='mt-4'>
                          Clear all filters
                        </Button>
                      </div>
                    )}

                    {results.length > 0 && results.length < totalResults && (
                      <div className='flex justify-center'>
                        <Button
                          onClick={handleLoadMore}
                          disabled={isResultsLoading}
                          className='px-8'
                        >
                          {isResultsLoading ? 'Loading...' : 'View more'}
                        </Button>
                      </div>
                    )}
                  </section>
                ) : (
                  <div className='space-y-10'>
                    {categorySummaries.some((summary) => summary.items.length > 0) ? (
                      categorySummaries.map((summary) => {
                        if (summary.items.length === 0) return null;

                        return (
                          <section key={summary._id}>
                            <div className='flex items-center justify-between mb-4'>
                              <h2 className='text-2xl font-semibold capitalize'>{summary.name}</h2>
                              <span className='text-sm text-muted-foreground'>
                                {summary.total} items
                              </span>
                            </div>

                            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                              {summary.items.map((item) => (
                                <MenuItem key={item._id} item={item} />
                              ))}
                            </div>

                            {summary.total > summary.items.length && (
                              <div className='mt-4 flex justify-end'>
                                <Button
                                  onClick={() =>
                                    handleViewMoreCategory(toCategorySlug(summary.name))
                                  }
                                >
                                  View more
                                </Button>
                              </div>
                            )}
                          </section>
                        );
                      })
                    ) : (
                      <div className='text-center py-10'>
                        <p className='text-muted-foreground'>
                          This restaurant does not have available menu items yet.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Card className='w-full p-5 space-y-5'>
              <div className='space-y-2'>
                <p className='text-sm font-semibold'>Sort by</p>
                <Select
                  value={pendingSortBy}
                  onValueChange={(value) => handleSortChange(value as SortOption)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Sort menu items' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='newest'>Newest added</SelectItem>
                    <SelectItem value='oldest'>Oldest added</SelectItem>
                    <SelectItem value='price_asc'>Low price to high</SelectItem>
                    <SelectItem value='price_desc'>High price to low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-3'>
                <p className='text-sm font-semibold'>Filter by category</p>
                <div className='grid grid-cols-1 gap-2'>
                  {categories.map((category) => {
                    const categorySlug = toCategorySlug(category.name);

                    return (
                      <label
                        key={category._id}
                        className='flex items-center gap-2 text-sm leading-none'
                      >
                        <Checkbox
                          className='h-4 w-4 shrink-0 p-0 flex-none'
                          checked={pendingSelectedCategories.includes(categorySlug)}
                          onCheckedChange={() => toggleCategory(categorySlug)}
                        />
                        <span className='min-w-0 capitalize'>{category.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className='space-y-3'>
                <p className='text-sm font-semibold'>Price range</p>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='space-y-1'>
                    <span className='text-xs text-muted-foreground'>Min price</span>
                    <Input
                      type='number'
                      min='0'
                      value={pendingMinPrice}
                      onChange={(event) => {
                        setPendingMinPrice(event.target.value);
                      }}
                      placeholder='10'
                    />
                  </div>
                  <div className='space-y-1'>
                    <span className='text-xs text-muted-foreground'>Max price</span>
                    <Input
                      type='number'
                      min='0'
                      value={pendingMaxPrice}
                      onChange={(event) => {
                        setPendingMaxPrice(event.target.value);
                      }}
                      placeholder='50'
                    />
                  </div>
                </div>
              </div>

              <div className='space-y-2'>
                <Button className='w-full' onClick={handleApplyFilters}>
                  Apply filters
                </Button>

                <Button variant='outline' className='w-full' onClick={handleClearFilters}>
                  Reset filters
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </main>
  );
};

export default RestaurantMenuPage;
