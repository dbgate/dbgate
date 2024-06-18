<script lang="ts">
  import _ from 'lodash';

  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import { useDatabaseList } from '../utility/metadataLoaders';
  import uuidv1 from 'uuid/v1';
  import { temporaryOpenedConnections } from '../stores';
  import useEffect from '../utility/useEffect';

  export let conidName;

  const { values } = getFormContext();
  $: databases = useDatabaseList({ conid: $values && $values[conidName] });

  $: databaseOptions = _.sortBy(
    ($databases || []).map(db => ({
      value: db.name,
      label: db.name,
    })),
    'label'
  );

  const tmpid = uuidv1();

  $: effect = useEffect(() => {
    temporaryOpenedConnections.update(x => [...x, { tmpid, conid: $values && $values[conidName] }]);
    return () => {
      temporaryOpenedConnections.update(x => x.filter(y => y.tmpid != tmpid));
    };
  });
  $: $effect;
</script>

<FormSelectField {...$$restProps} options={databaseOptions} />
