import React from "react";
import _ from "lodash";

function getIconImage(src, { size = 16, style = {}, className, title }) {
  if (src.endsWith(".svg")) {
    src = "/icons/" + src;
  }
  //   if (props.alignToLine) {
  //     style["position"] = "relative";
  //     style["top"] = "-2px";
  //     style["marginRight"] = "4px";
  //   }
  return (
    <img
      width={size}
      height={size}
      src={src}
      style={style}
      className={className}
      title={title}
    />
  );
}

export function getFontIcon(fontIconSpec, props = {}) {
  let iconClass = fontIconSpec;
  if (!iconClass) return null;
  var parts = iconClass.split(" ");
  var name = parts[0];
  parts = parts.slice(1);

  var className = props.className || "";

  // if (_.startsWith(name, 'bs-')) className += ` glyphicon glyphicon-${name.substr(3)}`;
  if (_.startsWith(name, "fa-")) className += ` fas fa-${name.substr(3)}`;

  if (_.includes(parts, "spin")) className += " fa-spin";

  var style = props.style || {};

  var last = parts[parts.length - 1];
  if (last && last != "spin") {
    style["color"] = last;
  }

  return <i className={className} style={style} title={props.title} />;
}

export const TableIcon = props => getIconImage("table2.svg", props);
export const ViewIcon = props => getIconImage("view2.svg", props);
export const DatabaseIcon = props => getIconImage("database.svg", props);
export const ServerIcon = props => getIconImage("server.svg", props);

export const MicrosoftIcon = props => getIconImage("microsoft.svg", props);
export const MySqlIcon = props => getIconImage("mysql.svg", props);
export const PostgreSqlIcon = props => getIconImage("postgresql.svg", props);
export const SqliteIcon = props => getIconImage("sqlite.svg", props);

export const ProcedureIcon = props => getIconImage("procedure2.svg", props);
export const FunctionIcon = props => getIconImage("function.svg", props);
export const TriggerIcon = props => getIconImage("trigger.svg", props);

export const HomeIcon = props => getIconImage("home.svg", props);
export const PrimaryKeyIcon = props => getIconImage("primarykey.svg", props);
export const ForeignKeyIcon = props => getIconImage("foreignkey.svg", props);
export const ComplexKeyIcon = props => getIconImage("complexkey.svg", props);
export const VariableIcon = props => getIconImage("variable.svg", props);
export const UniqueIcon = props => getIconImage("unique.svg", props);
export const IndexIcon = props => getIconImage("index.svg", props);

export const StartIcon = props => getIconImage("start.svg", props);
export const DownCircleIcon = props => getIconImage("down_circle.svg", props);

export const ColumnIcon = props => getIconImage("column.svg", props);

export const SqlIcon = props => getIconImage("sql.svg", props);
export const ExcelIcon = props => getIconImage("excel.svg", props);
export const DiagramIcon = props => getIconImage("diagram.svg", props);
export const QueryDesignIcon = props => getIconImage("querydesign.svg", props);
export const LocalDbIcon = props => getIconImage("localdb.svg", props);
export const CsvIcon = props => getIconImage("csv.svg", props);
export const ChangeSetIcon = props => getIconImage("changeset.svg", props);
export const BinaryFileIcon = props => getIconImage("binaryfile.svg", props);

export const ReferenceIcon = props => getIconImage("reference.svg", props);
export const LinkIcon = props => getIconImage("link.svg", props);

export const SequenceIcon = props => getIconImage("sequence.svg", props);
export const CheckIcon = props => getIconImage("check.svg", props);

export const LinkedServerIcon = props =>
  getIconImage("linkedserver.svg", props);

export const EmptyIcon = props =>
  getIconImage(
    "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
    props
  );

export const TimesRedIcon = props => getFontIcon("fa-times red", props);
export const TimesGreenCircleIcon = props =>
  getFontIcon("fa-times-circle green", props);
export const GrayFilterIcon = props =>
  getFontIcon("fa-filter lightgray", props);
export const ExclamationTriangleIcon = props =>
  getFontIcon("fa-exclamation-triangle", props);
export const HourGlassIcon = props => getFontIcon("fa-hourglass", props);
export const InfoBlueCircleIcon = props =>
  getFontIcon("fa-info-circle blue", props);

export const SpinnerIcon = props => getFontIcon("fa-spinner spin", props);

export const FontIcon = ({ name }) => <i className={`fas ${name}`}></i>;
