import React from 'react';
import styled from 'styled-components';
import { ManagerInnerContainer } from './ManagerStyles';
import { LinkIcon, ReferenceIcon } from '../icons';

const SearchBoxWrapper = styled.div`
  display: flex;
  margin-bottom: 5px;
`;

const Input = styled.input`
  flex: 1;
  min-width: 90px;
`;

const Header = styled.div`
  font-weight: bold;
`;

const LinkContainer = styled.div`
  color: #337ab7;
  margin: 5px;
  &:hover {
    text-decoration: underline;
  }
  cursor: pointer;
  display: flex;
`;

const NameContainer = styled.div`
  margin-left: 5px;
`;

function ManagerRow({ tableName, columns, Icon, onClick }) {
  return (
    <LinkContainer onClick={onClick}>
      <Icon />
      <NameContainer>
        {tableName} ({columns.map((x) => x.columnName).join(', ')})
      </NameContainer>
    </LinkContainer>
  );
}

/** @param props {import('./types').DataGridProps} */
export default function ReferenceManager(props) {
  const [filter, setFilter] = React.useState('');
  const { display } = props;
  const { baseTable } = display || {};
  const { foreignKeys } = baseTable || {};
  const { dependencies } = baseTable || {};

  return (
    <>
      <SearchBoxWrapper>
        <Input type="text" placeholder="Search" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </SearchBoxWrapper>
      <ManagerInnerContainer>
        {foreignKeys && foreignKeys.length > 0 && (
          <>
            <Header>References tables ({foreignKeys.length})</Header>
            {foreignKeys.map((fk) => (
              <ManagerRow
                key={fk.constraintName}
                Icon={LinkIcon}
                tableName={fk.refTableName}
                columns={fk.columns}
                onClick={() =>
                  props.onReferenceClick({
                    schemaName: fk.refSchemaName,
                    pureName: fk.refTableName,
                    columns: fk.columns.map((col) => ({
                      baseName: col.columnName,
                      refName: col.refColumnName,
                    })),
                  })
                }
              />
            ))}
          </>
        )}
        {dependencies && dependencies.length > 0 && (
          <>
            <Header>Dependend tables ({dependencies.length})</Header>
            {dependencies.map((fk) => (
              <ManagerRow
                key={fk.constraintName}
                Icon={ReferenceIcon}
                tableName={fk.pureName}
                columns={fk.columns}
                onClick={() =>
                  props.onReferenceClick({
                    schemaName: fk.schemaName,
                    pureName: fk.pureName,
                    columns: fk.columns.map((col) => ({
                      baseName: col.refColumnName,
                      refName: col.columnName,
                    })),
                  })
                }
              />
            ))}
          </>
        )}
      </ManagerInnerContainer>
    </>
  );
}
