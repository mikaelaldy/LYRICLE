import { useState, useEffect } from "react";
import { usePuzzleAutocomplete } from "@workspace/api-client-react";
import { getPuzzleAutocompleteQueryKey } from "@workspace/api-client-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, Music, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuessInputProps {
  onGuess: (artist: string, title: string) => void;
  disabled?: boolean;
}

export default function GuessInput({ onGuess, disabled }: GuessInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = usePuzzleAutocomplete(
    { q: debouncedSearch },
    { query: { enabled: debouncedSearch.length > 1, queryKey: getPuzzleAutocompleteQueryKey({ q: debouncedSearch }) } }
  );

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12 bg-card border-border text-left font-normal hover:bg-card/80"
            disabled={disabled}
            data-testid="input-guess-trigger"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Search className="w-4 h-4 shrink-0 opacity-50" />
              <span className="truncate">{search || "Search for a song..."}</span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0 bg-card border-border" align="start">
          <Command shouldFilter={false} className="bg-card">
            <CommandInput 
              placeholder="Type artist or song title..." 
              value={search} 
              onValueChange={setSearch}
              className="h-12 border-none focus:ring-0"
              data-testid="input-guess-search"
            />
            <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
              <CommandEmpty className="p-4 text-sm text-muted-foreground">
                {isLoading ? "Searching..." : "No songs found."}
              </CommandEmpty>
              {data?.tracks && data.tracks.length > 0 && (
                <CommandGroup>
                  {data.tracks.map((track) => (
                    <CommandItem
                      key={`${track.artist}-${track.title}`}
                      value={track.displayName}
                      onSelect={() => {
                        onGuess(track.artist, track.title);
                        setSearch("");
                        setOpen(false);
                      }}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary aria-selected:bg-secondary"
                      data-testid={`item-song-${track.artist}-${track.title}`}
                    >
                      <div className="w-10 h-10 shrink-0 bg-muted rounded flex items-center justify-center overflow-hidden border border-border">
                        {track.albumArtUrl ? (
                          <img src={track.albumArtUrl} alt={track.title} className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-5 h-5 opacity-20" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate text-foreground">{track.title}</span>
                        <span className="text-xs text-muted-foreground truncate">{track.artist}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
