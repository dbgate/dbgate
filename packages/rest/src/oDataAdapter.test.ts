const { analyseODataDefinition } = require('./oDataAdapter');

function findEndpoint(apiInfo, path, method = 'GET') {
  return apiInfo.categories
    .flatMap(category => category.endpoints)
    .find(endpoint => endpoint.path === path && endpoint.method === method);
}

test('deduces mandatory company parameter for customers and items from ContainsTarget metadata', () => {
  const serviceDocument = {
    '@odata.context': 'https://example/odata/$metadata',
    value: [
      { name: 'companies', kind: 'EntitySet', url: 'companies' },
      { name: 'customers', kind: 'EntitySet', url: 'customers' },
      { name: 'items', kind: 'EntitySet', url: 'items' },
    ],
  };

  const metadataXml = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="Microsoft.NAV" Alias="NAV" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="company">
        <Key><PropertyRef Name="id"/></Key>
        <Property Name="id" Type="Edm.Guid"/>
        <Property Name="displayName" Type="Edm.String"/>
        <NavigationProperty Name="customers" Type="Collection(NAV.customer)" ContainsTarget="true" />
        <NavigationProperty Name="items" Type="Collection(NAV.item)" ContainsTarget="true" />
      </EntityType>
      <EntityType Name="customer">
        <Property Name="id" Type="Edm.Guid"/>
      </EntityType>
      <EntityType Name="item">
        <Property Name="id" Type="Edm.Guid"/>
      </EntityType>
      <EntityContainer Name="default">
        <EntitySet Name="companies" EntityType="NAV.company">
          <NavigationPropertyBinding Path="customers" Target="customers"/>
          <NavigationPropertyBinding Path="items" Target="items"/>
        </EntitySet>
        <EntitySet Name="customers" EntityType="NAV.customer"/>
        <EntitySet Name="items" EntityType="NAV.item"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

  const apiInfo = analyseODataDefinition(serviceDocument, 'https://example/odata', metadataXml);

  const customersGet = findEndpoint(apiInfo, '/customers', 'GET');
  const itemsGet = findEndpoint(apiInfo, '/items', 'GET');

  expect(customersGet).toBeDefined();
  expect(itemsGet).toBeDefined();

  const customersCompany = customersGet.parameters.find(param => param.name === 'company');
  const itemsCompany = itemsGet.parameters.find(param => param.name === 'company');

  expect(customersCompany).toBeDefined();
  expect(customersCompany.required).toBe(true);
  expect(customersCompany.in).toBe('query');
  expect(customersCompany.odataLookupEntitySet).toBe('companies');
  expect(customersCompany.odataLookupPath).toBe('/companies');

  expect(itemsCompany).toBeDefined();
  expect(itemsCompany.required).toBe(true);
  expect(itemsCompany.in).toBe('query');
  expect(itemsCompany.odataLookupEntitySet).toBe('companies');
  expect(itemsCompany.odataLookupPath).toBe('/companies');
});
