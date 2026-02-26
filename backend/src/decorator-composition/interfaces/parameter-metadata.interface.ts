/** Source of the parameter value extracted from the request */
export type ParamSource = 'param' | 'query' | 'body' | 'custom';

/** One entry stored per parameter position on a method */
export interface ParamDecoratorEntry {
  /** Zero-based index in the method's parameter list */
  index: number;
  source: ParamSource;
  /** e.g. 'id' for @Param('id'); absent means "whole object" */
  key?: string;
  /** Custom extractor function for @CustomParam */
  extractor?: (req: any) => any;
}
