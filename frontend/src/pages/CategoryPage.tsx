import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { publicApi } from '../api/endpoints.js';
import { apiErrorMessage } from '../api/client.js';
import { Layout } from '../components/Layout.js';
import { Breadcrumb } from '../components/Breadcrumb.js';
import { ItemCard, CardGrid } from '../components/ItemCard.js';
import { Loading, ErrorState, EmptyState } from '../components/States.js';

export function CategoryPage() {
  const { id } = useParams();
  const categoryId = Number(id);
  const { data, isLoading, error } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => publicApi.getCategory(categoryId),
  });

  return (
    <Layout showSearch>
      {isLoading && <Loading />}
      {error && <ErrorState message={apiErrorMessage(error)} />}
      {data && (
        <>
          <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: data.category.name }]} />
          <div className="mb-7 flex flex-wrap items-center gap-3">
            <span className="id-tag">{data.category.code}</span>
            <h1 className="text-3xl font-extrabold text-slate-900">{data.category.name}</h1>
          </div>
          {data.category.description && (
            <p className="-mt-4 mb-7 max-w-2xl text-slate-500">{data.category.description}</p>
          )}
          {data.failureTypes.length === 0 ? (
            <EmptyState message="No failure types in this category yet." />
          ) : (
            <CardGrid>
              {data.failureTypes.map((ft) => (
                <ItemCard
                  key={ft.id}
                  to={`/failure-types/${ft.id}`}
                  code={ft.code}
                  name={ft.name}
                  imagePath={ft.imagePath}
                  subtitle={`${ft.rootCauseCount ?? 0} root cause${
                    ft.rootCauseCount === 1 ? '' : 's'
                  }`}
                />
              ))}
            </CardGrid>
          )}
        </>
      )}
    </Layout>
  );
}
