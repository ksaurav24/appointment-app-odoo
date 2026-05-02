import type { NoShowFeatureVector, NoShowScore } from '../domain/models.ts';

export interface MlModelPort {
  scoreNoShow(features: NoShowFeatureVector): Promise<NoShowScore>;
}
