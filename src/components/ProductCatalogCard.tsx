import React from 'react';
import { ProductCard, ProductCardProps } from './ProductCard';

export interface ProductCatalogCardProps extends ProductCardProps {}

export const ProductCatalogCard: React.FC<ProductCatalogCardProps> = (props) => {
  return <ProductCard {...props} />;
};

export default ProductCatalogCard;
