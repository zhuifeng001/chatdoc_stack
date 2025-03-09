import { DataSource } from 'typeorm';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import * as path from 'path';

if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: path.join(process.cwd(), '.env.development') });
}

export const baseConfig: MysqlConnectionOptions = {
  type: 'mysql',
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
  username: process.env.MYSQL_USERNAME || 'root',
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'gpt_qa',
  timezone: process.env.MYSQL_TIMEZONE || '+08:00',
  entityPrefix: process.env.MYSQL_TABLE_PREFIX,
};

const dataSource = new DataSource({
  ...baseConfig,
  entities: ['src/**/entities/*.entity{.js,.ts}'],
  migrations: ['migrations/*{.js,.ts}'],
  subscribers: ['subscribers/*{.js,.ts}'],
});

export default dataSource;
