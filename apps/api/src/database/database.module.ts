import { Global, Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { Pool } from 'pg';

export const PG_POOL = Symbol('PG_POOL');

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () =>
        new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://gtat:gtat@localhost:5432/gtat' }),
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}
  onModuleDestroy() {
    return this.pool.end();
  }
}
