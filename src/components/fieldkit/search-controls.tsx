import { SearchIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

export function SearchControls({
  subject,
  filters = false,
}: {
  subject: string;
  filters?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* TODO(product): Implement search and filter matching when product logic is enabled. */}
      <InputGroup className="min-h-11 max-w-md">
        <InputGroupInput
          aria-label={`Search ${subject}`}
          placeholder={`Search ${subject}…`}
          readOnly
          aria-describedby="search-preview-description"
        />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
      </InputGroup>
      {filters && (
        <NativeSelect
          aria-label="Filter tasks by status"
          disabled
          className="min-h-11 w-full sm:w-auto"
        >
          <NativeSelectOption>All tasks</NativeSelectOption>
          <NativeSelectOption>Open</NativeSelectOption>
          <NativeSelectOption>Completed</NativeSelectOption>
          <NativeSelectOption>Overdue</NativeSelectOption>
        </NativeSelect>
      )}
      <span id="search-preview-description" className="sr-only">
        Search and filtering are not available in this design preview.
      </span>
    </div>
  );
}
