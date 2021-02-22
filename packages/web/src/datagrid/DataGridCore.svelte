<div class="container">
  <input type="text" class="focus-field" />
  <table class="table">
    <thead>
      <tr>
        <td class="header=cell" data-row="header" data-col="header" />
      </tr>
    </thead>
    <tbody />
  </table>
</div>

<style>
  .container {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    user-select: none;
  }
  .table {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 20px;
    overflow: scroll;
    border-collapse: collapse;
    outline: none;
  }
  .header-cell {
    border: 1px solid var(---theme-border);
    text-align: left;
    padding: 0;
    margin: 0;
    background-color: var(---theme-bg-1);
    overflow: hidden;
  }
  .filter-cell {
    text-align: left;
    overflow: hidden;
    margin: 0;
    padding: 0;
  }
  .focus-field {
    position: absolute;
    left: -1000px;
    top: -1000px;
  }
  .row-count-label {
    position: absolute;
    background-color: var(---theme-bg-2);
    right: 40px;
    bottom: 20px;
  }
</style>
