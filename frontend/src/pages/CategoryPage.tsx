import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { publicApi } from '../api/endpoints.js';
import { apiErrorMessage } from '../api/client.js';
import { Layout } from '../components/Layout.js';
import { PageHero } from '../components/PageHero.js';
import { CategoryCard, CategoryGrid } from '../components/CategoryCard.js';
import { Loading, ErrorState, EmptyState } from '../components/States.js';

export function CategoryPage() {
  const { id } = useParams();
  const categoryId = Number(id);
  const { data, isLoading, error } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => publicApi.getCategory(categoryId),
  });

  return (
    <Layout
      showSearch
      hero={
        data && (
          <PageHero
            crumbs={[{ label: 'Home', to: '/' }, { label: data.category.name }]}
            code={data.category.code}
            title={data.category.name}
            description={data.category.description}
            imagePath={data.category.imagePath}
          />
        )
      }
    >
      {isLoading && <Loading />}
      {error && <ErrorState message={apiErrorMessage(error)} />}
      {data && (
        <>
          {data.failureTypes.length === 0 ? (
            <EmptyState message="No failure types in this category yet." />
          ) : (
            <CategoryGrid>
              {data.failureTypes.map((ft) => (
                <CategoryCard
                  key={ft.id}
                  to={`/failure-types/${ft.id}`}
                  code={ft.code}
                  name={ft.name}
                  imagePath={ft.imagePath}
                  subtitle={`${ft.rootCauseCount ?? 0} root cause${
                    ft.rootCauseCount === 1 ? '' : 's'
                  }`}
                  aspect="aspect-[16/10]"
                />
              ))}
            </CategoryGrid>
          )}
        </>
      )}
    </Layout>
  );
}
