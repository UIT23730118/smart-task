import { Input, Select } from "antd";
import { SearchOutlined, FilterOutlined } from "@ant-design/icons";

export default function FilterBar({ searchTerm, setSearchTerm, filterAssignee, setFilterAssignee, projectData }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "15px", width: "100%" }}>
      
      {/* Search Input */}
      <Input
        placeholder="Tìm kiếm..."
        prefix={<SearchOutlined />}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ width: "250px" }}
        allowClear
      />

      {/* Member Filter */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <FilterOutlined style={{ color: "#666" }} />
        <Select
          value={filterAssignee}
          style={{ width: 200 }}
          onChange={(value) => setFilterAssignee(value)}
          options={[
            { label: "Tất cả thành viên", value: "all" },
            ...projectData.members.map((m) => ({
              label: m.name,
              value: m.id
            }))
          ]}
        />
      </div>

    </div>
  );
}
