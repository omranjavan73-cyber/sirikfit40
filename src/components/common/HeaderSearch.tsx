import React from 'react';
import { SearchBar, SearchBarProps } from '../search/SearchBar';

export const HeaderSearch: React.FC<SearchBarProps> = (props) => {
  return <SearchBar {...props} />;
};

export default HeaderSearch;
