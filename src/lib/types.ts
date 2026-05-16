export interface Schema {
  type: string;
  format?: 'email' | 'url' | 'uuid' | 'datetime';
  fields?: Record<string, Schema>;
  itemType?: Schema;
}

export interface Converter {
  slug: string;
  title: string;
  description: string;
  h1?: string;
}
